import { useEffect } from "react";
import { isSpeakingAnswerAccepted } from "../../utils/speakingAcceptance.js";
import {
  isSpeakingConfigurationError,
  shouldCountSpeechRecognitionErrorAsAttempt,
} from "../../utils/speakingAttempts.js";

export function useSpeakingGrading({
  recognition,
  isReviewPlaying,
  question,
  reviewQuestion,
  actions,
}) {
  const {
    setReviewAttemptTranscript,
    resetReviewQuestionFailureState,
    setReviewStatus,
    setReviewScore,
    setReviewBlockingError,
    setReviewFailedAttempts,
    setAttemptTranscript,
    resetQuestionFailureState,
    setStatus,
    setScore,
    setBlockingError,
    setFailedAttempts,
  } = actions;

  useEffect(() => {
    const activeQuestion = isReviewPlaying ? reviewQuestion : question;

    if (!activeQuestion || recognition.listening) {
      return;
    }

    if (!recognition.transcript) {
      return;
    }

    const transcript = recognition.transcript.trim();
    if (isReviewPlaying) {
      setReviewAttemptTranscript(transcript);

      if (isSpeakingAnswerAccepted(recognition.candidates, activeQuestion.word)) {
        resetReviewQuestionFailureState();
        setReviewStatus((current) => {
          if (current !== "correct") {
            setReviewScore((scoreValue) => scoreValue + 1);
          }
          return "correct";
        });
        return;
      }

      setReviewBlockingError("");
      setReviewFailedAttempts((current) => current + 1);
      setReviewStatus("incorrect");
      return;
    }

    setAttemptTranscript(transcript);

    if (isSpeakingAnswerAccepted(recognition.candidates, activeQuestion.word)) {
      resetQuestionFailureState();
      setStatus((current) => {
        if (current !== "correct") {
          setScore((scoreValue) => scoreValue + 1);
        }
        return "correct";
      });
      return;
    }

    setBlockingError("");
    setFailedAttempts((current) => current + 1);
    setStatus("incorrect");
  }, [
    isReviewPlaying,
    question?.id,
    question?.word,
    recognition.listening,
    recognition.candidates,
    recognition.transcript,
    reviewQuestion?.id,
    reviewQuestion?.word,
  ]);

  useEffect(() => {
    const activeQuestion = isReviewPlaying ? reviewQuestion : question;

    if (!activeQuestion || !recognition.error) {
      return;
    }

    if (shouldCountSpeechRecognitionErrorAsAttempt(recognition.error)) {
      if (isReviewPlaying) {
        setReviewBlockingError("");
        setReviewFailedAttempts((current) => current + 1);
        setReviewStatus("empty");
        return;
      }

      setBlockingError("");
      setFailedAttempts((current) => current + 1);
      setStatus("empty");
      return;
    }

    if (isSpeakingConfigurationError(recognition.error)) {
      if (isReviewPlaying) {
        setReviewBlockingError(recognition.error);
        setReviewStatus("idle");
        return;
      }

      setBlockingError(recognition.error);
      setStatus("idle");
      return;
    }

    if (isReviewPlaying) {
      setReviewBlockingError("");
      setReviewStatus("incorrect");
      return;
    }

    setBlockingError("");
    setStatus("incorrect");
  }, [isReviewPlaying, question?.id, recognition.error, reviewQuestion?.id]);
}
