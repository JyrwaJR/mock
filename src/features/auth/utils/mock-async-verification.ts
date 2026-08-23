import { randomBetween } from './random-between';

export const mockAsyncVerification = () => {
  const delay = randomBetween(2000, 3000);

  return new Promise<boolean>((resolve) => {
    setTimeout(() => {
      resolve(false); // or true depending on mock logic
    }, delay);
  });
};
