declare module "wordcloud" {
  export default function renderWordCloud(
    canvas: HTMLCanvasElement,
    options: {
      list: (string | number)[][];
      fontFamily: string;
      fontWeight: string;
      backgroundColor: string;
      gridSize: number;
      rotateRatio: number;
      shuffle: boolean;
      shrinkToFit: boolean;
      drawOutOfBound: boolean;
      weightFactor: (value: number) => number;
      color: (word: string) => string;
    },
  ): void;
}
