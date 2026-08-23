import { createHash } from "crypto";

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatPassword(password: string): string {
  let i: number;
  let j: number;
  let temp: string;

  const random: string[] = [
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
  ];

  const randomSep: string[] = ["z", "y", "x", "u", "v", "m"];

  const salt: (number | string)[] = [];

  const pwd: string[] = createHash("sha256")
    .update(password, "utf8")
    .digest("hex")
    .split("");

  for (i = 0; i < 20; i++) {
    if (i <= 3) {
      j = i;
    } else {
      j = randomBetween(4, 63);
    }

    temp = pwd[j];
    pwd[j] = random[Math.floor(Math.random() * random.length)];

    salt.push(j);
    salt.push(temp);
    salt.push(randomSep[Math.floor(Math.random() * randomSep.length)]);
  }

  const pwdEncode = Buffer.from(pwd.join("") + salt.join(""), "utf8").toString(
    "base64",
  );

  return pwdEncode;
}
