"use client";

import { FC, useEffect, useState } from "react";
import { useDraw } from "../hooks/useDraw";
import { ChromePicker } from "react-color";

import { io } from "socket.io-client";
import { drawLine } from "../utils/drawLine";
const socket = io("http://localhost:3001");

let mediaRecorder: MediaRecorder | undefined;
let chunks: BlobPart[] = [];

interface pageProps {}

type DrawLineProps = {
  prevPoint: Point | null;
  currentPoint: Point;
  color: string;
};

const page: FC<pageProps> = ({}) => {
  const [color, setColor] = useState<string>("#000");
  const { canvasRef, onMouseDown, clear } = useDraw(createLine);
  const [recording, setRecording] = useState<boolean>(false);

  // button start, stop
  const [isStartDisabled, setIsStartDisabled] = useState(false);
  const [isStopDisabled, setIsStopDisabled] = useState(true);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");

    socket.emit("client-ready");

    socket.on("get-canvas-state", () => {
      if (!canvasRef.current?.toDataURL()) return;
      console.log("sending canvas state");
      socket.emit("canvas-state", canvasRef.current.toDataURL());
    });

    socket.on("canvas-state-from-server", (state: string) => {
      console.log("I received the state");
      const img = new Image();
      img.src = state;
      img.onload = () => {
        ctx?.drawImage(img, 0, 0);
      };
    });

    socket.on(
      "draw-line",
      ({ prevPoint, currentPoint, color }: DrawLineProps) => {
        if (!ctx) return console.log("no ctx here");
        drawLine({ prevPoint, currentPoint, ctx, color });
      }
    );

    socket.on("clear", clear);

    return () => {
      socket.off("draw-line");
      socket.off("get-canvas-state");
      socket.off("canvas-state-from-server");
      socket.off("clear");
    };
  }, [canvasRef]);

  function createLine({ prevPoint, currentPoint, ctx }: Draw) {
    socket.emit("draw-line", { prevPoint, currentPoint, color });
    drawLine({ prevPoint, currentPoint, ctx, color });
  }
  const startRecording = () => {
    console.log("hello from startRecording");
    const videoStream = canvasRef.current!.captureStream(30);
    mediaRecorder = new MediaRecorder(videoStream);
    chunks = [];

    mediaRecorder.ondataavailable = function (e) {
      chunks!.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/mp4" });
      const videoURL = URL.createObjectURL(blob);
      const videoElement = document.querySelector("video");

      if (videoElement) {
        videoElement!.src = videoURL;
        videoElement!.play(); // Automatically play the recorded video
      }
    };

    mediaRecorder.start();

    // If you want to include drawing at intervals while recording:
    // setInterval(draw, 300);

    // Assuming startButton and stopButton are references to your buttons
    setIsStartDisabled(true);
    setIsStopDisabled(false);
  };

  const stopRecording = () => {
    console.log("hello from stopRecording");
    console.log("mediaRecorder: ", mediaRecorder);
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder = undefined; // Reset mediaRecorder
    }
  };

  return (
    <div className="w-screen h-screen bg-white flex justify-center items-center">
      <div className="flex flex-col gap-10 pr-10">
        <ChromePicker color={color} onChange={(e) => setColor(e.hex)} />
        <button
          type="button"
          className="p-2 rounded-md border border-black"
          onClick={() => socket.emit("clear")}
        >
          Clear canvas
        </button>
        <button
          className="bg-gray-700 rounded-md p-3"
          type="button"
          onClick={startRecording}
          disabled={isStartDisabled}
        >
          Start Recording
        </button>
        <button
          className="bg-gray-700 rounded-md p-3"
          type="button"
          onClick={stopRecording}
          disabled={isStopDisabled}
        >
          Stop Recording
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        width={750}
        height={750}
        className="border border-black rounded-md"
      />
      <video src="" autoPlay controls></video>
    </div>
  );
};

export default page;
