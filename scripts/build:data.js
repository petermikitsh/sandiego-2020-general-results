#!/usr/bin/env node

const path = require('path');
const { readdirSync, readFileSync, createWriteStream } = require('fs');
const { Transform } = require('stream');
const xml2js = require('xml2js');
const mapshaper = require('mapshaper');
const csvtojson = require('csvtojson');
const bigjson = require('big-json');
const { format } = require('date-fns');

const xmlParser = xml2js.Parser();

const SOURCE_DIR = 'rawdata';
const OUT_DIR = 'data';

const getDirectories = (source) =>
  readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => ({
      id: dirent.name,
    }));

// Metadata
(async () => {
  const electionDirs = getDirectories(SOURCE_DIR);
  const elections = electionDirs.map(async ({ id: electionId }) => {
    const results = await Promise.all(
      getDirectories(path.resolve(SOURCE_DIR, electionId)).map(
        async ({ id: resultId }) => {
          const resultDir = path.resolve(
            __dirname,
            '..',
            SOURCE_DIR,
            electionId,
            resultId,
          );
          const summary = await xmlParser.parseStringPromise(
            readFileSync(path.resolve(resultDir, `summary_${electionId}.xml`)),
          );

          return {
            resultId,
            createdAt: summary?.NewDataSet?.GeneratedDate?.[0],
          };
        },
      ),
    );

    return {
      electionId,
      name: `${format(
        new Date(results[0].createdAt),
        'MMMM do yyyy',
      )} Election`,
      results: results.reverse(),
    };
  });

  bigjson
    .createStringifyStream({
      body: elections,
    })
    .pipe(
      createWriteStream(
        path.resolve(__dirname, '..', OUT_DIR, 'metadata.json'),
      ),
    );
})();

// Elections
(async () => {
  const electionDirs = getDirectories(SOURCE_DIR);

  electionDirs.map(async ({ id: electionId }) => {
    const rawPrecinctData = await readFileSync(
      path.resolve(__dirname, '..', SOURCE_DIR, electionId, 'sandiego.txt'),
    );

    const {
      ['result.geojson']: precinctBuffer,
    } = await mapshaper.applyCommands(
      '-i sandiego.geojson -drop fields=COUNT,EID,BT,RV_TOTALS,PVBM,NET_RVS,Shape_Leng,Shape_Area -o result.geojson',
      { 'sandiego.geojson': rawPrecinctData },
    );

    const precincts = precinctBuffer.toString();

    const rawConsolidationData = precincts.toString().replace(/-VBM/g, '');
    const {
      ['result.geojson']: consolidationBuffer,
    } = await mapshaper.applyCommands(
      '-i sandiego.geojson -dissolve2 "CONSNAME" -o result.geojson',
      { 'sandiego.geojson': rawConsolidationData },
    );

    const consolidations = consolidationBuffer.toString();

    bigjson
      .createStringifyStream({
        body: {
          id: electionId,
          precincts: JSON.parse(precincts),
          consolidations: JSON.parse(consolidations),
        },
      })
      .pipe(
        createWriteStream(
          path.resolve(__dirname, '..', OUT_DIR, `${electionId}.json`),
        ),
      );
  });
})();

// Results
(async () => {
  const electionDirs = getDirectories(SOURCE_DIR);

  electionDirs.map(async ({ id: electionId }) => {
    getDirectories(path.resolve(SOURCE_DIR, electionId)).map(
      async ({ id: resultId }) => {
        const resultDir = path.resolve(
          __dirname,
          '..',
          SOURCE_DIR,
          electionId,
          resultId,
        );

        const lineToArray = new Transform({
          transform(chunk, encoding, cb) {
            this.push(
              (this.isNotAtFirstRow ? ',' : '[') +
                chunk.toString('utf-8').slice(0, -1),
            );
            this.isNotAtFirstRow = true;
            cb();
          },
          flush(cb) {
            // add ] to very end or [] if no rows
            const isEmpty = !this.isNotAtFirstRow;
            this.push(isEmpty ? '[]' : ']');
            cb();
          },
        });

        csvtojson({
          downstreamFormat: 'line',
          checkType: true,
          colParser: {
            votes: 'number',
            id: (item) => {
              const [, id] = item.match(/\d{4}-(\d{6})-(.*)/);
              return id;
            },
            consName: (_, __, ___, row) => {
              const precinct = row[0];
              const [, , consName] = precinct.match(/\d{4}-(\d{6})-(.*)/);
              return consName;
            },
          },
        })
          .preRawData((str) => {
            // Ignore first line in CSV files
            const [, header, ...data] = str.split('\n');
            const newHeader = header
              .replace('Precinct', 'id')
              .replace('Contest Name', 'contest')
              .replace('Candidate Name', 'candidate')
              .replace('Votes', 'votes')
              .replace('Voter Turnout', 'consName');
            return [newHeader, ...data].join('\n');
          })
          .fromFile(path.resolve(resultDir, `precincts_${electionId}.csv`))
          .pipe(lineToArray)
          .pipe(
            createWriteStream(
              path.resolve(
                __dirname,
                '..',
                OUT_DIR,
                `${electionId}_${resultId}.json`,
              ),
            ),
          );
      },
    );
  });
})();
