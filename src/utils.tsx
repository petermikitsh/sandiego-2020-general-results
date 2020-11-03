import React, { useState, useEffect } from 'react';
import { quantize } from 'd3-interpolate';
import { scaleOrdinal } from '@visx/scale';
import { interpolateTurbo } from 'd3-scale-chromatic';
import { default as Metadata } from '../data/metadata.json';
import type { Election, Consolidations, ResultSet, Precincts } from './types';

export type ContestSummary = {
  createdAt: string;
  summary: { [key: string]: number };
  results: ResultSet;
};

async function getFile<T>(file: string) {
  const result: T = await (
    await fetch(`/sandiego-2020-general-results/data/${file}?v=2`)
  ).json();
  return result;
}

export interface AppContext {
  contests: { [key: string]: string[] };
  currElectionId: string;
  setCurrElectionId?(id: string): void;
  currResultId: string;
  setCurrResultId?(id: string): void;
  currContestId: string;
  setCurrContestId?(id: string): void;
  metadata?: typeof Metadata;
  maps?: { [key: string]: Election };
  getContestSummary?(
    electionId: string,
    contestId: string,
  ): Promise<ContestSummary[] | undefined>;
}

export const AppContext = React.createContext<AppContext>({
  contests: {},
  currContestId: '',
  currResultId: '',
  currElectionId: '',
});

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currElectionId, setCurrElectionId] = useState<string>('');
  const [currResultId, setCurrResultId] = useState<string>('');
  const [currContestId, setCurrContestId] = useState<string>('');
  const [metadata] = useState<typeof Metadata>(() => Metadata);
  const [maps, setMaps] = useState<AppContext['maps']>({});
  const [contests, setContests] = useState<AppContext['contests']>({});

  useEffect(() => {
    setCurrElectionId(metadata[0].electionId);
    setCurrResultId(metadata[0].results[0].resultId);
  }, [metadata]);

  useEffect(() => {
    (async () => {
      if (currElectionId) {
        const precincts = await getFile<Precincts>(
          `${currElectionId}_precincts.json`,
        );
        const consolidations = await getFile<Consolidations>(
          `${currElectionId}_consolidations.json`,
        );
        setMaps((prevValue) => ({
          ...prevValue,
          [currElectionId]: { id: currElectionId, precincts, consolidations },
        }));
        const currElection = metadata.find(
          ({ electionId }) => electionId === currElectionId,
        );
        setCurrResultId(currElection?.results[0].resultId as string);
      }
    })();
  }, [currElectionId, metadata, setCurrResultId]);

  useEffect(() => {
    (async () => {
      if (currElectionId) {
        if (!contests[currElectionId]) {
          const newContests = await getFile<string[]>(
            `${currElectionId}_contests.json`,
          );
          setContests((prevValue) => ({
            ...prevValue,
            [currElectionId]: newContests,
          }));
          setCurrContestId(newContests[0]);
        } else {
          setCurrContestId(contests[currElectionId][0]);
        }
      }
    })();
  }, [currElectionId, contests, setCurrContestId, setContests]);

  return (
    <AppContext.Provider
      value={{
        contests,
        currElectionId,
        setCurrElectionId,
        currResultId,
        setCurrResultId,
        currContestId,
        setCurrContestId,
        metadata,
        maps,
        getContestSummary: async (eId, contestId) => {
          const sanitizedContestId = encodeURIComponent(contestId).replace(
            /%/g,
            '',
          );
          const resultIds = metadata
            .find(({ electionId }) => electionId === eId)
            ?.results.map((result) => result.resultId);

          const data = (
            await Promise.all<ContestSummary>(
              (resultIds || []).map(async (resultId) =>
                getFile<ContestSummary>(
                  `${eId}_${resultId}_${sanitizedContestId}.json`,
                ),
              ),
            )
          ).reverse();

          return data;
        },
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const getColorScaleForSummary = (summary: ContestSummary['summary']) => {
  const candidateNames = Object.keys(summary);
  const ordinalColorScale = scaleOrdinal<string, string>({
    domain: candidateNames,
    range: quantize(interpolateTurbo, candidateNames.length),
  });
  return ordinalColorScale;
};
