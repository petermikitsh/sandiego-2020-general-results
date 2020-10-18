import React, { useContext } from 'react';
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

const InnerApp = () => {
  const {
    currElectionId,
    setCurrElectionId,
    currResultId,
    setCurrResultId,
    currContestId,
    setCurrContestId,
    metadata,
    electionData,
    resultSet,
  } = useContext(AppContext);

  const contests = [...new Set(resultSet?.map((result) => result.contest))];

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
              {contests.map((contestName) => (
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
        {electionData?.precincts.features && (
          <Map geojson={electionData?.precincts as any} />
        )}
        <Typography component="h1" variant="h4" style={{ marginTop: '20px' }}>
          Contests
        </Typography>
        <Typography style={{ maxWidth: '600px', lineHeight: '35px' }}>
          {contests.map((contestName) => (
            <React.Fragment key={contestName}>
              <Link
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
