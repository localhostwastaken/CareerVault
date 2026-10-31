// The fixed question bank. Ids are stored with each employee key and are part of the derived
// key material, so an id must never be renamed or reused for a different question.
export const SECURITY_QUESTIONS = [
  { id: 'first-school', text: 'What was the name of your first school?' },
  { id: 'birth-city', text: 'In which city were you born?' },
  { id: 'first-pet', text: 'What was the name of your first pet?' },
  { id: 'first-employer', text: 'What was the name of your first employer?' },
  { id: 'childhood-street', text: 'What street did you live on as a child?' },
  {
    id: 'favourite-teacher',
    text: 'What was the surname of your favourite teacher?',
  },
] as const;

export const SECURITY_QUESTION_IDS: readonly string[] = SECURITY_QUESTIONS.map(
  (question) => question.id,
);

export const REQUIRED_ANSWERS = 3;

export function questionText(id: string): string {
  return SECURITY_QUESTIONS.find((question) => question.id === id)?.text ?? id;
}
