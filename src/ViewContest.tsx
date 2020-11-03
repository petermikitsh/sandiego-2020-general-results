import React, { useContext, useEffect, useState } from 'react';
import { scaleTime, scaleLinear } from '@visx/scale';
import { Group } from '@visx/group';
import { LinePath } from '@visx/shape';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { Link, useParams } from 'react-router-dom';
import { Link as MuiLink, Typography, useTheme } from '@material-ui/core';
import { AppContext, getColorScaleForSummary } from './utils';
import type { ContestSummary } from './utils';
import { Legend } from './Legend';

export const ViewContest = () => {
  const { electionId, contestId: encodedContestId } = useParams<{
    electionId: string;
    contestId: string;
  }>();
  const theme = useTheme();

  const contestId = decodeURIComponent(encodedContestId);

  const {
    currElectionId,
    setCurrElectionId,
    currContestId,
    setCurrContestId,
    getContestSummary,
  } = useContext(AppContext);

  const [lineGraph, setLineGraph] = React.useState<React.ReactNode>(null);
  const [contestSummary, setContestSummary] = useState<ContestSummary[]>();

  const { summary = {} } = contestSummary?.[contestSummary.length - 1] || {};
  const candidateNames = Object.keys(summary);
  const ordinalColorScale = getColorScaleForSummary(summary);

  React.useEffect(() => {
    (async () => {
      const newSummary = await getContestSummary?.(electionId, contestId);
      setContestSummary(newSummary);
    })();
  }, [getContestSummary, electionId, contestId]);

  React.useEffect(() => {
    if (contestSummary) {
      const HEIGHT = 500;
      const WIDTH = 600;
      const LEFT_MARGIN = 50;
      const BOTTOM_MARGIN = 50;
      const TOP_MARGIN = 10;
      const RIGHT_MARGIN = 0;
      const date = (cs: ContestSummary) => new Date(cs.createdAt).valueOf();

      const oldestReportDate = Math.min(...contestSummary.map(date));
      const newestReportDate = Math.max(...contestSummary.map(date));
      const xScale = scaleTime<number>({
        domain: [oldestReportDate, newestReportDate],
      }).range([0, WIDTH - LEFT_MARGIN - RIGHT_MARGIN]);

      const lowestVoteCount =
        Math.min(
          ...contestSummary.map((cs) => Math.min(...Object.values(cs.summary))),
        ) || 0;
      const highestVoteCount =
        Math.max(
          ...contestSummary.map((cs) => Math.max(...Object.values(cs.summary))),
        ) || 0;
      const yScale = scaleLinear<number>({
        domain: [lowestVoteCount, highestVoteCount],
      }).range([HEIGHT - TOP_MARGIN, BOTTOM_MARGIN]);
      const getX = (cs: ContestSummary) => xScale(date(cs)) as number;
      const getY = (candidate: string) => (cs: ContestSummary) =>
        yScale(cs.summary[candidate] || 0) as number;

      setLineGraph(
        <>
          <Legend summary={summary} border overflow />
          <svg height={HEIGHT} width={WIDTH}>
            <Group left={LEFT_MARGIN} top={TOP_MARGIN}>
              {candidateNames
                .sort((a, b) => summary[a] - summary[b])
                .map((candidateName) => (
                  <LinePath<ContestSummary>
                    key={candidateName}
                    data={contestSummary}
                    x={getX}
                    y={getY(candidateName)}
                    stroke={ordinalColorScale?.(candidateName)}
                    strokeWidth={2}
                    transform={`translate(0, -${BOTTOM_MARGIN})`}
                  />
                ))}
              <AxisLeft scale={yScale} top={-BOTTOM_MARGIN} />
              <AxisBottom
                top={HEIGHT - BOTTOM_MARGIN - TOP_MARGIN}
                scale={xScale}
                numTicks={10}
              />
            </Group>
          </svg>
        </>,
      );
    }
  }, [contestSummary]);

  useEffect(() => {
    setCurrElectionId?.(electionId);
    setCurrContestId?.(contestId);
  }, [
    currElectionId,
    currContestId,
    setCurrElectionId,
    setCurrContestId,
    electionId,
    contestId,
  ]);

  const candidates = Object.entries(summary).sort(([, a], [, b]) => b - a);
  const highestCount = Math.max(...Object.values(summary));

  const leadingCandidates = candidates.filter(
    ([, count]) => count > 0 && count === highestCount,
  );

  return (
    <>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ width: '100%', textAlign: 'center', marginTop: '10px' }}>
          <Link component={MuiLink} to="/">
            Home
          </Link>
        </div>
        <Typography component="h1" variant="h4" style={{ marginTop: '50px' }}>
          {contestId}
        </Typography>
        <Typography component="h1" variant="h4" style={{ marginTop: '20px' }}>
          {leadingCandidates.map(([candidate]) => (
            <div key={candidate}>
              <span
                style={{
                  backgroundColor: ordinalColorScale(candidate),
                  color: theme.palette.getContrastText(
                    ordinalColorScale(candidate),
                  ),
                }}
              >
                &nbsp;{candidate}&nbsp;
              </span>
            </div>
          ))}
        </Typography>
        {lineGraph}
      </div>
    </>
  );
};
