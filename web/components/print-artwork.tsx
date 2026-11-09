import {
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Svg,
} from "@react-pdf/renderer";
import type { InvitationContent } from "@/lib/invitations";

export const PRINT_WIDTH = 419.53;
export const PRINT_HEIGHT = 595.28;

function shade(hex: string, amount: number) {
  const channels = [1, 3, 5].map((offset) =>
    parseInt(hex.slice(offset, offset + 2), 16),
  );
  return `#${channels
    .map((value) =>
      Math.round(
        amount > 0 ? value + (255 - value) * amount : value * (1 + amount),
      )
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
function warmLight(hex: string) {
  return `#${[1, 3, 5]
    .map((offset, index) =>
      Math.round(
        parseInt(hex.slice(offset, offset + 2), 16) * 0.68 +
          [161, 148, 112][index] * 0.32,
      )
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

// Deterministic, fine vector grain: the PDF retains sharp text and decorative strokes.
function paperGrain(seed: number) {
  let state = seed;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  let path = "";
  for (let n = 0; n < 2800; n++) {
    const x = random() * PRINT_WIDTH,
      y = random() * PRINT_HEIGHT;
    path += `M${x.toFixed(2)} ${y.toFixed(2)}h${(0.12 + random() * 0.45).toFixed(2)}`;
  }
  return path;
}
const lightGrain = paperGrain(9274);
const darkGrain = paperGrain(5812);
const panel =
  "M81 75H163C178 75 177 62 193 62H226C242 62 241 75 256 75H338Q352 75 352 90V108Q352 121 367 121H373V474H367Q352 474 352 487V506Q352 520 338 520H256C241 520 242 533 226 533H193C177 533 178 520 163 520H81Q67 520 67 506V487Q67 474 52 474H46V121H52Q67 121 67 108V90Q67 75 81 75Z";

function Corner({
  transform,
  color,
  ornate,
}: {
  transform: string;
  color: string;
  ornate: boolean;
}) {
  return (
    <G
      transform={transform}
      stroke={color}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path
        d="M20 113V46Q20 22 44 22H138M26 96V47Q26 28 45 28H122M20 119v10M144 22h13M31 83V50Q31 34 49 34H101"
        strokeWidth={0.65}
      />
      <Path d="M34 51Q33 35 51 35M20 36V22H33M38 22h6" strokeWidth={0.45} />
      {ornate && (
        <G transform="translate(8.8 8.8) scale(.6)">
          <Path
            d="M25 69C25 59 40 60 38 48C37 39 24 44 30 51C35 56 47 44 43 37C39 30 30 39 37 42C45 46 49 26 57 29C65 32 55 42 52 35C49 29 60 22 67 28C74 35 62 43 59 36M31 61C47 61 46 47 51 46C59 43 62 53 56 55C50 57 48 49 55 45C62 41 73 44 72 35C71 26 61 32 66 37C71 42 82 28 87 29"
            strokeWidth={0.64}
          />
          <Path
            d="M30 71C41 71 43 64 43 59C36 60 32 63 30 71ZM44 47C44 39 48 33 54 33C54 40 50 45 44 47ZM58 27C64 19 71 20 73 23C67 28 62 29 58 27ZM40 34C34 30 34 25 38 23C43 27 44 31 40 34ZM25 53C18 48 20 41 23 40C28 45 29 49 25 53ZM59 54C64 58 68 55 69 51C65 48 61 49 59 54Z"
            strokeWidth={0.5}
          />
          <Path
            d="M34 76l1-1m13-19 1-1m28-25 1-1M29 32l.5-.5"
            strokeWidth={1.2}
          />
        </G>
      )}
    </G>
  );
}

function Crest({ transform, color }: { transform: string; color: string }) {
  return (
    <G
      transform={transform}
      stroke={color}
      fill="none"
      strokeWidth={0.65}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M25 39V14C18 11 20 5 25 1C30 5 32 11 25 14M25 23C19 12 11 14 12 21C13 27 21 25 19 21C17 17 9 21 11 28C13 35 23 32 25 27M25 23C31 12 39 14 38 21C37 27 29 25 31 21C33 17 41 21 39 28C37 35 27 32 25 27M25 29C18 37 8 32 6 25C2 16 9 12 10 17M25 29C32 37 42 32 44 25C48 16 41 12 40 17M19 37L25 34L31 37M20 41l5 5 5-5M17 14C13 10 14 6 17 5C20 8 20 11 17 14ZM33 14C37 10 36 6 33 5C30 8 30 11 33 14Z" />
      <Path
        d="M2 27l-1-1m48 0-1 1M25 0v-2M7 36l-2 1m38-1 2 1M21 8h8"
        strokeWidth={0.65}
      />
    </G>
  );
}

export function PrintArtwork({ content: c }: { content: InvitationContent }) {
  const ornate = c.ornament === "botanical";
  const forest = c.theme === "forest";
  return (
    <Svg
      width={PRINT_WIDTH}
      height={PRINT_HEIGHT}
      viewBox={`0 0 ${PRINT_WIDTH} ${PRINT_HEIGHT}`}
      style={{ position: "absolute", top: 0, left: 0 }}
      fixed
    >
      <Defs>
        <LinearGradient id="paper" x1="0%" y1="0%" x2="85%" y2="100%">
          <Stop
            offset="0%"
            stopColor={
              forest ? warmLight(c.background) : shade(c.background, 0.015)
            }
          />
          <Stop
            offset="48%"
            stopColor={shade(c.background, forest ? 0.045 : 0)}
          />
          <Stop
            offset="100%"
            stopColor={shade(c.background, forest ? -0.11 : -0.025)}
          />
        </LinearGradient>
        <LinearGradient id="inset" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop
            offset="0%"
            stopColor={shade(c.background, forest ? 0.01 : -0.025)}
          />
          <Stop
            offset="100%"
            stopColor={shade(c.background, forest ? -0.035 : -0.04)}
          />
        </LinearGradient>
      </Defs>
      <Rect width={PRINT_WIDTH} height={PRINT_HEIGHT} fill="url(#paper)" />
      <Path
        d={panel}
        fill="url(#inset)"
        stroke={shade(c.background, -0.11)}
        strokeWidth={0.35}
      />
      <Path
        d={lightGrain}
        stroke={forest ? "#DBDAC2" : "#FFFFFF"}
        strokeWidth={0.28}
        opacity={forest ? 0.11 : 0.35}
      />
      <Path
        d={darkGrain}
        stroke={forest ? "#061F1B" : "#796C4B"}
        strokeWidth={0.25}
        opacity={forest ? 0.14 : 0.06}
      />
      {c.ornament !== "none" && (
        <>
          <Corner
            transform="matrix(1 0 0 1 0 0)"
            color={c.accent}
            ornate={ornate}
          />
          <Corner
            transform={`matrix(-1 0 0 1 ${PRINT_WIDTH} 0)`}
            color={c.accent}
            ornate={ornate}
          />
          <Corner
            transform={`matrix(1 0 0 -1 0 ${PRINT_HEIGHT})`}
            color={c.accent}
            ornate={ornate}
          />
          <Corner
            transform={`matrix(-1 0 0 -1 ${PRINT_WIDTH} ${PRINT_HEIGHT})`}
            color={c.accent}
            ornate={ornate}
          />
          <G stroke={c.accent} strokeWidth={0.6} fill="none">
            <Path d="M20 222v89m5-102v85m-5 34v7m5-33v9M20 393v57m5-70v55" />
            <Path
              d={`M${PRINT_WIDTH - 20} 222v89m-5-102v85m5 34v7m-5-33v9M${PRINT_WIDTH - 20} 393v57m-5-70v55`}
            />
          </G>
          {ornate && (
            <>
              <Crest
                transform={`translate(${PRINT_WIDTH / 2 - 16.25} 75) scale(.65)`}
                color={c.accent}
              />
              <Crest
                transform={`translate(${PRINT_WIDTH / 2 - 16.25} 530) scale(.65)`}
                color={c.accent}
              />
            </>
          )}
        </>
      )}
    </Svg>
  );
}
