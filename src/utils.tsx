import React, { useState, useEffect } from 'react';
import type { default as Metadata } from '../data/metadata.json';
import type { Election, ResultSet } from './types';

export type ContestSummary = { [key: string]: number } & { timestamp: string };

async function getFile<T>(file: string) {
  const result: T = await (
    await fetch(`/sandiego-2020-general-results/data/${file}`)
  ).json();
  return result;
}

export interface AppContext {
  currElectionId: string;
  setCurrElectionId?(id: string): void;
  currResultId: string;
  setCurrResultId?(id: string): void;
  currContestId: string;
  setCurrContestId?(id: string): void;
  metadata?: typeof Metadata;
  setMetadata?(metadata: typeof Metadata): void;
  electionData?: Election;
  resultSet?: ResultSet;
  getContestSummary?(
    electionId: string,
    contestId: string,
  ): Promise<ContestSummary[] | undefined>;
}

export const AppContext = React.createContext<AppContext>({
  currContestId: '',
  currResultId: '',
  currElectionId: '',
});

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currElectionId, setCurrElectionId] = useState<string>('');
  const [currResultId, setCurrResultId] = useState<string>('');
  const [currContestId, setCurrContestId] = useState<string>('');
  const [metadata, setMetadata] = useState<typeof Metadata>();
  const [electionData, setElectionData] = useState<Election>();
  const [resultSet, setResultSet] = useState<ResultSet>();
  const [allResultSets, setAllResultSets] = useState<{
    [key: string]: ResultSet[];
  }>({});

  useEffect(() => {
    (async () => {
      if (!metadata) {
        const meta = await getFile<typeof Metadata>('metadata.json');
        setMetadata(meta);
        setCurrElectionId(meta[0].electionId);
        setCurrResultId(meta[0].results[0].resultId);
      }
    })();
  }, [metadata]);

  useEffect(() => {
    (async () => {
      if (currElectionId) {
        const newElectionData = await getFile<Election>(
          `${currElectionId}.json`,
        );
        setElectionData(newElectionData);
        const currElection = metadata?.find(
          ({ electionId }) => electionId === currElectionId,
        );
        setCurrResultId?.(currElection?.results[0].resultId as string);
      }
    })();
  }, [currElectionId, metadata, setCurrResultId]);

  useEffect(() => {
    (async () => {
      if (currElectionId && currResultId) {
        const newResults = await getFile<ResultSet>(
          `${currElectionId}_${currResultId}.json`,
        );
        setResultSet(newResults);
        const contestId = [
          ...new Set(newResults?.map((result) => result.contest)),
        ][0];
        setCurrContestId?.(contestId);
      }
    })();
  }, [currElectionId, currResultId, setCurrContestId]);

  return (
    <AppContext.Provider
      value={{
        currElectionId,
        setCurrElectionId,
        currResultId,
        setCurrResultId,
        currContestId,
        setCurrContestId,
        metadata,
        setMetadata,
        electionData,
        resultSet,
        getContestSummary: async (eId, contestId) => {
          const results = await (async () => {
            if (!allResultSets[eId]) {
              const resultIds = metadata
                ?.find(({ electionId }) => electionId === eId)
                ?.results.map((result) => result.resultId);

              if (resultIds) {
                const results = await Promise.all<ResultSet>(
                  resultIds.map((resultId) =>
                    getFile(`${eId}_${resultId}.json`),
                  ),
                );
                setAllResultSets({
                  ...allResultSets,
                  [eId]: results,
                });
                return results;
              }

              return;
            }
            return allResultSets[eId];
          })();

          const summary = results
            ?.map((resultSet, index) => {
              return resultSet.reduce(
                (acc, currResult) => {
                  if (currResult.contest !== contestId) {
                    return acc;
                  }
                  if (!acc[currResult.candidate]) {
                    acc[currResult.candidate] = currResult.votes;
                  } else {
                    acc[currResult.candidate] += currResult.votes;
                  }
                  return acc;
                },
                {
                  timestamp: metadata?.find(
                    (election) => election.electionId === eId,
                  )?.results[index].createdAt,
                } as ContestSummary,
              );
            })
            .reverse();

          return summary;
        },
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
