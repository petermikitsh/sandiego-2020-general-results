import React, { useEffect } from 'react';
import { CustomProjection } from '@visx/geo';
import type { GeoPermissibleObjects } from '@visx/geo/lib/types';
import { Zoom } from '@visx/zoom';
import { geoMercator } from 'd3-geo';
import styled from 'styled-components';

const HEIGHT = 500;
const WIDTH = 800;

interface MapProps {
  geojson: GeoPermissibleObjects[];
}

const Polygon = styled.path`
  stroke: #000;
  stroke-width: 0.1px;
  fill: #fff;
  fill-opacity: 0.001;
  cursor: pointer;

  &:hover:not([data-id='SDCOUNTY']) {
    stroke-width: 0.45px;
  }
`;

export const Map = ({ geojson }: MapProps) => {
  const boxRef = React.useRef(
    <rect
      x={0}
      y={0}
      width={WIDTH}
      height={HEIGHT}
      stroke="#000"
      strokeWidth="5px"
      fill="transparent"
    />,
  );
  const [projection, setProjection] = React.useState<React.ReactNode>(null);

  useEffect(() => {
    (async () => {
      const sdcounty = await import('./sdcounty.json');
      setProjection(
        <CustomProjection
          projection={() =>
            geoMercator().fitSize([WIDTH, HEIGHT], sdcounty as any)
          }
          data={[sdcounty, ...(geojson as any).features]}
        >
          {(customProjection) =>
            customProjection.features.map(({ path, feature }, id) => {
              const buggyRegions = [
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

              return (
                <Polygon
                  key={id}
                  d={path || ''}
                  data-id={(feature as any)?.properties?.CONSNAME || 'SDCOUNTY'}
                />
              );
            })
          }
        </CustomProjection>,
      );
    })();
  }, [geojson]);

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
          >
            {boxRef.current}
            <g transform={zoom.toString()}>{projection}</g>
          </svg>
        );
        return elem;
      }}
    </Zoom>
  );
};
