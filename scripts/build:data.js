#!/usr/bin/env node

const path = require('path');
const {
  readdirSync,
  readFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
} = require('fs');
const xml2js = require('xml2js');
const mapshaper = require('mapshaper');
const papaparse = require('papaparse');
const { createReadStream } = require('fs');

const xmlParser = xml2js.Parser();
const SOURCE_DIR = 'rawdata';
const OUT_DIR = 'data';
const OUT_PATH = path.resolve(__dirname, '..', OUT_DIR);

const getDirectories = (source) =>
  readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => ({
      id: dirent.name,
    }));

const getWritePath = (filename) => path.resolve(OUT_PATH, filename);

if (!existsSync(OUT_PATH)) {
  mkdirSync(OUT_PATH);
}

// Metadata
(async () => {
  const electionDirs = getDirectories(SOURCE_DIR);
  const elections = await Promise.all(
    electionDirs.map(async ({ id: electionId }) => {
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
              readFileSync(
                path.resolve(resultDir, `summary_${electionId}.xml`),
              ),
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
        name: (() => {
          switch (electionId) {
            case '8':
              return 'March 3, 2020 Primary';
            case '10':
              return 'November 3, 2020 General';
          }
        })(),
        results: results.reverse(),
      };
    }),
  );

  createWriteStream(getWritePath('metadata.json')).write(
    JSON.stringify(elections),
  );
})();

// Election Maps
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

    const rawConsolidationData = precinctBuffer.toString().replace(/-VBM/g, '');
    const {
      ['result.geojson']: consolidationBuffer,
    } = await mapshaper.applyCommands(
      '-i sandiego.geojson -dissolve2 "CONSNAME" -o result.geojson',
      { 'sandiego.geojson': rawConsolidationData },
    );

    createWriteStream(getWritePath(`${electionId}_precincts.json`)).write(
      precinctBuffer,
    );

    createWriteStream(getWritePath(`${electionId}_consolidations.json`)).write(
      consolidationBuffer,
    );
  });
})();

// Contest Results (per result set)
(async () =>
  getDirectories(SOURCE_DIR).map(async ({ id: electionId }) =>
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

        const fullPath = path.resolve(resultDir, `precincts_${electionId}.csv`);
        // key: contest name, value: array of results
        const resultSet = {};

        return new Promise((resolve) => {
          papaparse.parse(createReadStream(fullPath), {
            dynamicTyping: true,
            header: true,
            beforeFirstChunk: (chunk) => {
              const [, ...rest] = chunk.split('\n');
              return rest.join('\n');
            },
            step: ({
              data: {
                'Contest Name': contestName,
                Precinct,
                'Candidate Name': candidate,
                Votes: votes,
              },
            }) => {
              if (!resultSet[contestName]) {
                resultSet[contestName] = {
                  createdAt: summary?.NewDataSet?.GeneratedDate?.[0],
                  summary: {},
                  results: [],
                };
              }

              if (!resultSet[contestName].summary[candidate]) {
                resultSet[contestName].summary[candidate] = 0;
              }

              resultSet[contestName].summary[candidate] += votes;

              const [, id] = Precinct.match(/\d{4}-(\d{6})-(.*)/);
              const [, , consName] = Precinct.match(/\d{4}-(\d{6})-(.*)/);

              resultSet[contestName].results.push({
                id,
                consName,
                candidate,
                votes,
              });
            },
            complete: () => {
              createWriteStream(
                getWritePath(`${electionId}_contests.json`),
              ).write(JSON.stringify(Object.keys(resultSet)));
              Object.entries(resultSet).forEach(([contestName, value]) => {
                try {
                  createWriteStream(
                    getWritePath(
                      encodeURIComponent(
                        `${electionId}_${resultId}_${contestName}.json`,
                      ).replace(/%/g, ''),
                    ),
                  ).write(JSON.stringify(value));
                } catch (err) {
                  console.log(err);
                }
              });
              resolve();
            },
          });
        });
      },
    ),
  ))();
