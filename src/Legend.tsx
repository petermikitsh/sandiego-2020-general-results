import React from 'react';
import { Tooltip } from '@material-ui/core';
import { LegendOrdinal, LegendItem, LegendLabel } from '@visx/legend';
import type { ContestSummary } from './utils';
import { getColorScaleForSummary } from './utils';

interface LegendProps {
  summary: ContestSummary['summary'];
  stack?: boolean;
  border?: boolean;
  overflow?: boolean;
}

export const Legend = ({
  summary,
  stack = false,
  border = false,
  overflow = false,
}: LegendProps) => {
  const voteCount = Object.values(summary).reduce((sum, x) => sum + x, 0);
  const ordinalColorScale = getColorScaleForSummary(summary);
  return (
    <div className="legend">
      <LegendOrdinal
        scale={ordinalColorScale as any}
        labelFormat={(label) => `${(label as string).toUpperCase()}`}
      >
        {(labels) => (
          <div
            style={{
              backgroundColor: '#FFF',
              display: stack ? 'block' : 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              lineHeight: '24px',
              border: border ? '2px solid #000' : 'auto',
              width: 'auto',
              ...(overflow && {
                maxHeight: '100px',
                overflowY: 'auto',
              }),
            }}
          >
            {labels
              .sort((a, b) => summary[b.text] - summary[a.text])
              .map((label, i) => {
                return (
                  <LegendItem
                    key={`legend-quantile-${i}`}
                    style={{
                      flexBasis: stack ? '100%' : 'auto',
                      display: stack ? 'flex' : 'inline-flex',
                      alignItems: 'center',
                      margin: '0 5px',
                    }}
                  >
                    <svg width={15} height={15}>
                      <rect fill={label.value} width={15} height={15} />
                    </svg>
                    <LegendLabel align="left" margin="0 0 0 4px">
                      <Tooltip title={label.text}>
                        <div
                          style={{
                            maxWidth: '200px',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {label.text}
                        </div>
                      </Tooltip>
                      {'\u00A0'}
                      {new Intl.NumberFormat('en-US').format(
                        summary[label.text] || 0,
                      )}{' '}
                      {new Intl.NumberFormat('en-US', {
                        style: 'percent',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format((summary[label.text] || 0) / (voteCount || 1))}
                    </LegendLabel>
                  </LegendItem>
                );
              })}
          </div>
        )}
      </LegendOrdinal>
      <style>{`
        .legend {
          line-height: 0.9em;
          font-size: 10px;
          padding: 10px 10px;
          float: left;
          margin: 5px 5px;
        }
      `}</style>
    </div>
  );
};
