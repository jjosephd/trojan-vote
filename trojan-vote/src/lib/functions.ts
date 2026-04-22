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
