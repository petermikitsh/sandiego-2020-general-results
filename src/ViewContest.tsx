import React, { useContext, useEffect, useState } from 'react';
import { LegendOrdinal, LegendItem, LegendLabel } from '@visx/legend';
import { scaleTime, scaleLinear } from '@visx/scale';
import { Group } from '@visx/group';
import { LinePath } from '@visx/shape';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { Link, useParams } from 'react-router-dom';
import { scaleOrdinal } from '@visx/scale';
import { Link as MuiLink, Typography, useTheme } from '@material-ui/core';
import { quantize } from 'd3-interpolate';
import { interpolateTurbo } from 'd3-scale-chromatic';
import { AppContext } from './utils';
import type { ContestSummary } from './utils';

interface LegendProps {
  children: React.ReactNode;
}

const Legend: React.FC<LegendProps> = ({ children }: LegendProps) => {
  return (
    <div className="legend">
      {children}
      <style>{`
        .legend {
          line-height: 0.9em;
          font-size: 10px;
          padding: 10px 10px;
          float: left;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          margin: 5px 5px;
        }
      `}</style>
    </div>
  );
};

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

  const lineGraph = React.useRef<React.ReactNode>(null);
  const [contestSummary, setContestSummary] = useState<ContestSummary[]>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { timestamp, ...candidates } =
    contestSummary?.[contestSummary.length - 1] || {};
  const candidateNames = Object.keys(candidates);

  const candidateNamesByVoteCount = candidateNames?.sort((a, b) => {
    return (candidates as any)[b] - (candidates as any)[a];
  });
  const ordinalColorScale = candidateNames
    ? scaleOrdinal<string, string>({
        domain: candidateNames,
        range: quantize(interpolateTurbo, candidateNames.length),
      })
    : undefined;

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
      const date = (cs: ContestSummary) => new Date(cs.timestamp).valueOf();

      const oldestReportDate = Math.min(...contestSummary.map(date));
      const newestReportDate = Math.max(...contestSummary.map(date));
      const xScale = scaleTime<number>({
        domain: [oldestReportDate, newestReportDate],
      }).range([0, WIDTH - LEFT_MARGIN - RIGHT_MARGIN]);

      const lowestVoteCount = Math.min(
        ...contestSummary.map((cs) =>
          Math.min(...Object.values(cs).filter(Number)),
        ),
      );
      const highestVoteCount = Math.max(
        ...contestSummary.map((cs) =>
          Math.max(...Object.values(cs).filter(Number)),
        ),
      );
      const yScale = scaleLinear<number>({
        domain: [lowestVoteCount, highestVoteCount],
      }).range([HEIGHT - TOP_MARGIN, BOTTOM_MARGIN]);
      const getX = (cs: ContestSummary) => xScale(date(cs)) as number;
      const getY = (candidate: string) => (cs: ContestSummary) =>
        yScale(cs[candidate]) as number;

      ordinalColorScale?.domain;

      lineGraph.current = (
        <>
          <Legend>
            <LegendOrdinal
              scale={ordinalColorScale as any}
              labelFormat={(label) => `${(label as string).toUpperCase()}`}
            >
              {(labels) => (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    lineHeight: '24px',
                  }}
                >
                  {labels.map((label, i) => (
                    <LegendItem key={`legend-quantile-${i}`} margin="0 5px">
                      <svg width={15} height={15}>
                        <rect fill={label.value} width={15} height={15} />
                      </svg>
                      <LegendLabel align="left" margin="0 0 0 4px">
                        {label.text}
                      </LegendLabel>
                    </LegendItem>
                  ))}
                </div>
              )}
            </LegendOrdinal>
          </Legend>
          <svg height={HEIGHT} width={WIDTH}>
            <Group left={LEFT_MARGIN} top={TOP_MARGIN}>
              {candidateNamesByVoteCount.map((candidateName) => (
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
        </>
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

  const maxObjValue = (obj?: object) =>
    Object.keys(obj || {}).reduce(
      (a, b) => ((obj as any)[a] > (obj as any)[b] ? a : b),
      '',
    );

  const leadingCandidate =
    maxObjValue(contestSummary?.[contestSummary.length - 1]) || undefined;

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
          {leadingCandidate && ordinalColorScale && (
            <div style={{ marginTop: '16px' }}>
              <span
                style={{
                  padding: '8px',
                  backgroundColor: ordinalColorScale(leadingCandidate),
                  color: theme.palette.getContrastText(
                    ordinalColorScale(leadingCandidate),
                  ),
                }}
              >
                {leadingCandidate}
              </span>
            </div>
          )}
        </Typography>
        {lineGraph.current}
      </div>
    </>
  );
};
