// The details every e2e signer enrols with and re-enters to sign (the step-up). Invented
// values: the server never stores them, only the key they derive.
export const STEP_UP = {
  dateOfBirth: '1990-01-15',
  personalId: 'E2E-0001',
  answers: [
    { questionId: 'first-school', answer: 'Somaiya Vidyavihar' },
    { questionId: 'birth-city', answer: 'Mumbai' },
    { questionId: 'first-pet', answer: 'Bruno' },
  ],
};
