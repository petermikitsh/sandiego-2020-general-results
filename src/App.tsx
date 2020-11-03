import React, { useContext, useState } from 'react';
import { HashRouter, Link, Switch, Route } from 'react-router-dom';
import { Star } from '@material-ui/icons';
import { format } from 'date-fns';
import {
  AppBar,
  createMuiTheme,
  CssBaseline,
  FormControl,
  InputLabel,
  Select,
  Link as MuiLink,
  MenuItem,
  Toolbar,
  ThemeProvider,
  Typography,
} from '@material-ui/core';
import { Map } from './Map';
import { AppContext, AppProvider } from './utils';
import { ViewContest } from './ViewContest';
import { Legend } from './Legend';
import type { ContestSummary } from './utils';

const InnerApp = () => {
  const {
    contests,
    currElectionId,
    setCurrElectionId,
    currResultId,
    setCurrResultId,
    currContestId,
    setCurrContestId,
    getContestSummary,
    metadata,
    maps,
  } = useContext(AppContext);
  const [contestSummaries, setContestSummary] = useState<ContestSummary[]>([]);
  const [firstContestSummary] = contestSummaries;

  const resultTime = metadata
    ?.find((election) => election.electionId === currElectionId)
    ?.results.find((result) => result.resultId === currResultId)?.createdAt;

  const currSummary = contestSummaries.find(
    (cs) => cs.createdAt === resultTime,
  );

  console.log(currSummary);

  React.useEffect(() => {
    (async () => {
      if (currElectionId && currContestId) {
        const newSummary = await getContestSummary?.(
          currElectionId,
          currContestId,
        );
        newSummary && setContestSummary(newSummary);
      }
    })();
  }, [getContestSummary, currElectionId, currContestId]);

  return (
    <>
      <AppBar
        position="static"
        style={{ backgroundColor: '#fff' }}
        elevation={1}
      >
        <Toolbar style={{ justifyContent: 'center' }}>
          <Star style={{ marginRight: '12px', fill: '#000' }} />
          <FormControl style={{ marginRight: '8px' }}>
            <InputLabel shrink>Election</InputLabel>
            <Select
              style={{ width: '275px' }}
              value={currElectionId}
              onChange={(event) => {
                setCurrContestId?.('');
                setCurrResultId?.('');
                setCurrElectionId?.(event.target.value as string);
              }}
              displayEmpty
              renderValue={metadata ? undefined : () => 'Loading...'}
            >
              {metadata?.map(({ electionId, name }) => (
                <MenuItem key={electionId} value={electionId}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl style={{ marginRight: '8px' }}>
            <InputLabel shrink>Contest</InputLabel>
            <Select
              style={{ width: '300px' }}
              value={currContestId}
              displayEmpty
              renderValue={currContestId ? undefined : () => 'Loading...'}
              onChange={(event) => {
                setCurrContestId?.(event.target.value as string);
              }}
            >
              {contests[currElectionId]?.map((contestName) => (
                <MenuItem key={contestName} value={contestName}>
                  {contestName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl style={{ marginRight: '8px' }}>
            <InputLabel shrink>Result Set</InputLabel>
            <Select
              style={{ width: '200px' }}
              value={currResultId}
              onChange={(e) => setCurrResultId?.(e.target.value as string)}
              displayEmpty
              renderValue={currResultId ? undefined : () => 'Loading...'}
            >
              {metadata
                ?.find(({ electionId }) => electionId === currElectionId)
                ?.results.map(({ createdAt, resultId }) => (
                  <MenuItem key={resultId} value={resultId}>
                    {format(new Date(createdAt), 'M/d/yy hh:mm a')}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <Star style={{ fill: '#000' }} />
        </Toolbar>
      </AppBar>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: '50px',
        }}
      >
        {maps?.[currElectionId]?.precincts.features && currSummary?.summary && (
          <>
            <div style={{ position: 'relative' }}>
              <Map
                geojson={maps?.[currElectionId]?.precincts as any}
                contestSummary={currSummary}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  maxWidth: '400px',
                }}
              >
                <Legend stack border summary={currSummary?.summary} overflow />
              </div>
            </div>
          </>
        )}
        <Typography component="h1" variant="h4" style={{ marginTop: '20px' }}>
          Contests
        </Typography>
        <Typography style={{ maxWidth: '600px', lineHeight: '35px' }}>
          {contests[currElectionId]?.map((contestName) => (
            <React.Fragment key={contestName}>
              <Link
                // target="_blank"
                component={MuiLink}
                to={`/elections/${currElectionId}/contests/${encodeURIComponent(
                  contestName,
                )}`}
                style={{ textDecoration: 'underline' }}
              >
                {contestName}
              </Link>

              <Star
                style={{
                  position: 'relative',
                  top: '7px',
                  marginLeft: '5px',
                  marginRight: '5px',
                }}
              />
            </React.Fragment>
          ))}
        </Typography>
      </div>
    </>
  );
};

const theme = createMuiTheme({
  typography: {
    fontFamily: ['"DM Mono"'].join(','),
  },
});

export const App = () => (
  <AppProvider>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Switch>
          <Route exact path="/">
            <InnerApp />
          </Route>
          <Route exact path="/elections/:electionId/contests/:contestId">
            <ViewContest />
          </Route>
        </Switch>
      </HashRouter>
    </ThemeProvider>
  </AppProvider>
);
