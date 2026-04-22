import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export interface SubmitVoteData {
  electionId: string;
  position: string;
  candidateId: string;
}

export interface SubmitVoteResult {
  success: boolean;
}

export const submitVote = httpsCallable<SubmitVoteData, SubmitVoteResult>(
  functions,
  "submitVote"
);

export interface ManageElectionData {
  action: "create" | "update" | "open" | "close";
  electionId?: string;
  data?: {
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  };
}

export const manageElection = httpsCallable<ManageElectionData, any>(
  functions,
  "manageElection"
);

export interface ManageCandidateData {
  action: "add" | "edit" | "remove";
  electionId: string;
  candidateId?: string;
  data?: {
    name?: string;
    position?: string;
    description?: string;
  };
}

export const manageCandidate = httpsCallable<ManageCandidateData, any>(
  functions,
  "manageCandidate"
);

export interface TallyResultsData {
  electionId: string;
}

export const tallyResults = httpsCallable<TallyResultsData, any>(
  functions,
  "tallyResults"
);
