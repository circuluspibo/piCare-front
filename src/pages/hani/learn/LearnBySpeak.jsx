/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect } from "react";
import { Square, AudioLines } from "lucide-react";
import useSpeechRecognition from "@/hooks/useSpeechRecognition";
import { judgePronunciation } from "@/utils/hangulPronunciation";


export default function LearnBySpeak({ item, handleAnswer }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState("");

  const audioRef = useRef(null);
  const repeatRef = useRef(0);
  const cancelledRef = useRef(false);

  const { isRecording, messages, handleStartRecording, handleStopRecording } = useSpeechRecognition();

  useEffect(() => {
    const lastMsg = messages[messages.length-1];
    if(lastMsg) setTranscript(lastMsg.text);
  }, [messages]);

  const stopPlayback = () => {
    cancelledRef.current = true;
    if(audioRef.current){
      audioRef.current.pause();
      audioRef.current.currentTime=0;
      audioRef.current=null;
    }
    setIsPlaying(false);
  }

  const playSound = async () => {
    if(isPlaying || isRecording) return;
    setIsPlaying(true);
    repeatRef.current=0;
    cancelledRef.current=false;

    try{
      const url = `/sounds/${item.letter}.mp3`; // 로컬 음원 경로
      const playOnce = () => {
        if(cancelledRef.current) return;
        const audio = new Audio(url);
        audioRef.current=audio;
        audio.play().catch(()=>stopPlayback());
        audio.onended = ()=>{
          repeatRef.current++;
          if(repeatRef.current<3 && !cancelledRef.current){
            setTimeout(()=>playOnce(),500);
          }else stopPlayback();
        }
      };
      playOnce();
    }catch(err){console.error(err); stopPlayback();}
  }

  const onStartRecord = async () => {
    if(isPlaying) stopPlayback();
    setTranscript("");
    await handleStartRecording();
  }

  const onStopRecord = () => {
    setIsAnalyzing(true);
    handleStopRecording();
    setTimeout(()=>setIsAnalyzing(false),500); // 간단히 분석 표시
  }

  const checkPronunciation = () => {
    if(!transcript) return;
    const isCorrect = judgePronunciation(transcript, item.letter);
    handleAnswer({ user: transcript, correct: item.letter, isCorrect });
    setTranscript("");
  }

  return (
    <div className="grid h-full grid-cols-12 gap-4">
      <div className="col-span-9 grid grid-rows-[auto_1fr] gap-4">
        <div className="w-full p-4 text-2xl font-bold text-center border rounded-lg shadow bg-lime-200">
          {`"말하기"를 누르고 "${item.letter}"을/를 소리내어 말해보세요.`}
        </div>
        <div className="grid w-full h-full grid-cols-9 gap-4">
          <div className="flex items-center justify-center col-span-4 bg-white border rounded-lg shadow">
            <p className="text-9xl">{item.letter}</p>
          </div>
          <div className="flex flex-col items-center justify-center col-span-5 gap-6 bg-white border rounded-lg shadow">
            <button onClick={playSound} disabled={isPlaying || isRecording} className="bg-lime-500 rounded-2xl text-4xl py-4 px-8 font-bold hover:bg-lime-600 transition-colors disabled:bg-gray-200">
              {isPlaying ? "🔊 재생 중..." : "🔊 소리 듣기"}
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center col-span-3 p-8 bg-white border rounded-lg shadow-sm gap-8">
        {!isRecording && !isAnalyzing && !transcript && (
          <button onClick={onStartRecord} disabled={isPlaying} className="flex flex-col items-center justify-center gap-10 py-8 text-3xl font-bold bg-lime-500 rounded-2xl animate-focus hover:bg-lime-600 w-full disabled:opacity-50">
            <p className="text-9xl">🎙️</p>
            <p>말하기</p>
          </button>
        )}
        {(isRecording || isAnalyzing || transcript) && (
          <div className="flex flex-col items-center justify-center gap-6 w-full">
            <p className="text-2xl font-extrabold text-center text-lime-600">
              {isAnalyzing ? "분석 중..." : isRecording ? "듣는 중..." : "인식 완료"}
            </p>
            {transcript && (
              <div className="text-center p-4 bg-lime-50 rounded-xl border border-lime-200 w-full">
                <p className="text-sm text-lime-600 mb-1">인식 결과</p>
                <p className="font-bold text-2xl text-black">"{transcript}"</p>
              </div>
            )}
            <div className="flex flex-col gap-3 w-full">
              {isRecording && (
                <button className="flex items-center justify-center gap-2 text-2xl font-bold bg-red-500 text-white rounded-xl py-4 hover:bg-red-600" onClick={onStopRecord}>
                  <Square size={24} fill="currentColor" /> 정지
                </button>
              )}
              {transcript && !isAnalyzing && (
                <>
                  <button className="flex items-center justify-center gap-2 text-2xl font-bold bg-lime-500 text-white rounded-xl py-4" onClick={checkPronunciation}>
                    <AudioLines size={24} /> 제출하기
                  </button>
                  <button className="text-lg font-bold text-gray-500 underline" onClick={onStartRecord}>
                    다시 녹음하기
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
