import React, { useEffect } from 'react';
import { CustomProjection } from '@visx/geo';
import type { GeoPermissibleObjects } from '@visx/geo/lib/types';
import { Zoom } from '@visx/zoom';
import { geoMercator } from 'd3-geo';
import styled from 'styled-components';
import type { ContestSummary } from './utils';
import { Legend } from './Legend';
import { getColorScaleForSummary } from './utils';
import { Tooltip } from '@material-ui/core';

interface MakeGradientsProps {
  colors: string[];
  id: string;
}

const MakeGradients: React.FC<MakeGradientsProps> = ({
  colors,
  id,
}: MakeGradientsProps) => {
  const meta = colors.reduce(
    (acc, currColor, index) => {
      const startPercentile = index / colors.length;
      const endPercentile = (index + 1) / colors.length;

      return [
        ...acc,
        {
          percentile: String(startPercentile),
          color: currColor,
        },
        {
          percentile: String(endPercentile),
          color: currColor,
        },
      ];
    },
    [] as {
      percentile: string;
      color: string;
    }[],
  );

  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x2="5"
      spreadMethod="repeat"
      gradientTransform="rotate(45)"
    >
      {meta.map(({ percentile, color }) => (
        <stop
          key={`${percentile}${color}`}
          offset={percentile}
          stopColor={color}
        />
      ))}
    </linearGradient>
  );
};

const HEIGHT = 500;
const WIDTH = 800;

const Polygon = styled.path`
  stroke: #000;
  stroke-width: 0.1px;
  cursor: pointer;

  &:hover:not([data-id='SDCOUNTY']) {
    stroke-width: 0.45px;
  }
`;

interface MapProps {
  geojson: GeoPermissibleObjects[];
  contestSummary: ContestSummary;
}

export const Map: React.FC<MapProps> = ({
  geojson,
  contestSummary,
}: MapProps) => {
  const [projection, setProjection] = React.useState<React.ReactNode>(null);

  useEffect(() => {
    (async () => {
      const sdcounty = await import('./sdcounty.json');
      const colorScale = getColorScaleForSummary(contestSummary.summary);
      const byPrecinct = contestSummary.results.reduce((acc, currValue) => {
        const { candidate, id: precinctId, votes } = currValue;
        acc[precinctId] = acc[precinctId] || {};
        acc[precinctId][candidate] =
          (acc?.[precinctId]?.[candidate] || 0) + votes;
        return acc;
      }, {} as { [key: string]: { [key: string]: number } });

      setProjection(
        <CustomProjection
          projection={() =>
            geoMercator().fitSize([WIDTH, HEIGHT], sdcounty as any)
          }
          data={[sdcounty, ...(geojson as any).features]}
        >
          {(customProjection) =>
            customProjection.features.map(({ path, feature }, id) => {
              const buggyRegions: string[] = [
                'PALA',
                'OAK GROVE',
                'SAN FELIPE',
                'BALLENA',
                'RAMONA',
                'JAMUL',
                'BORREGO SPRINGS',
                'DESCANSO',
                'PINE VALLEY',
                'UNINCORPORATED-VBM',
                // other map
                'RANCHITA',
                'CAMPO',
                'BOULEVARD',
                'JACUMBA',
              ];
              const isUnrenderableGeo =
                buggyRegions.indexOf((feature as any)?.properties?.CONSNAME) >
                -1;

              if (isUnrenderableGeo) {
                return <React.Fragment key={id} />;
              }

              const precinctId = (feature as any)?.properties?.PRECINCT;
              const summary = byPrecinct[precinctId];
              let color = '#FFF';
              let TooltipLabel: React.FC | null = null;
              let Gradient: React.FC | null = null;

              if (precinctId && summary) {
                const candidates = Object.entries(summary).sort(
                  ([, a], [, b]) => b - a,
                );
                const highestCount = Math.max(...Object.values(summary));
                const leadingCandidates = candidates.filter(
                  ([, count]) => count > 0 && count === highestCount,
                );
                if (leadingCandidates.length) {
                  const [
                    [firstCandidateName, firstCount],
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    ...rest
                  ] = leadingCandidates;
                  const totalVotes = Object.values(candidates).reduce(
                    (currSum, [, b]) => currSum + b,
                    0,
                  );
                  const colors = leadingCandidates.map(([name]) =>
                    colorScale(name),
                  );
                  if (leadingCandidates.length > 1) {
                    Gradient = () => (
                      <MakeGradients colors={colors} id={precinctId} />
                    );
                  }

                  color = colorScale(firstCandidateName);
                  const percent = new Intl.NumberFormat('en-US', {
                    style: 'percent',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(firstCount / (totalVotes || 1));
                  if (feature.properties.CONSNAME && firstCount) {
                    TooltipLabel = () => (
                      <div>
                        <div>
                          {feature.properties.CONSNAME} ({firstCount}/
                          {totalVotes})
                        </div>
                        <div>({percent})</div>
                      </div>
                    );
                  }
                }
              }

              return (
                <Tooltip key={id} title={TooltipLabel ? <TooltipLabel /> : ''}>
                  <g>
                    <Polygon
                      d={path || ''}
                      fill={Gradient ? `url(#${precinctId})` : color}
                      style={{
                        fillOpacity: 1,
                      }}
                      data-id={
                        (feature as any)?.properties?.CONSNAME || 'SDCOUNTY'
                      }
                    />
                    {Gradient ? <Gradient /> : null}
                  </g>
                </Tooltip>
              );
            })
          }
        </CustomProjection>,
      );
    })();
  }, [geojson, contestSummary]);

  return (
    <Zoom
      height={HEIGHT}
      width={WIDTH}
      scaleXMin={1}
      scaleYMin={1}
      scaleXMax={20}
      scaleYMax={20}
      transformMatrix={{
        scaleX: 2.5,
        scaleY: 2.5,
        translateX: -250,
        translateY: -750,
        skewX: 0,
        skewY: 0,
      }}
      wheelDelta={(event) =>
        -event.deltaY > 0
          ? { scaleX: 1.05, scaleY: 1.05 }
          : { scaleX: 0.95, scaleY: 0.95 }
      }
    >
      {(zoom) => {
        const elem = (
          <svg
            width={WIDTH}
            height={HEIGHT}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            onWheel={zoom.handleWheel}
            onTouchStart={zoom.dragStart}
            onTouchMove={zoom.dragMove}
            onTouchEnd={zoom.dragEnd}
            onMouseDown={zoom.dragStart}
            onMouseMove={zoom.dragMove}
            onMouseUp={zoom.dragEnd}
            onMouseLeave={() => {
              if (zoom.isDragging) zoom.dragEnd();
            }}
            style={{ border: '4px solid #000' }}
          >
            <g transform={zoom.toString()}>{projection}</g>
            {contestSummary?.summary ? (
              <Legend summary={contestSummary.summary} />
            ) : null}
          </svg>
        );
        return elem;
      }}
    </Zoom>
  );
};
