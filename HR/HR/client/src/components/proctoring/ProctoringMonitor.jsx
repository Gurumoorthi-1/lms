import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import Draggable from 'react-draggable';
import * as faceapi from '@vladmandic/face-api';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import toast from 'react-hot-toast';
import axios from 'axios';

const ProctoringMonitor = ({ interviewId, userId, token }) => {
  const webcamRef = useRef(null);
  const nodeRef = useRef(null); // Fix for React 18 findDOMNode error
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [objectModel, setObjectModel] = useState(null);
  const [warningActive, setWarningActive] = useState(false);
  const [lastWarningTime, setLastWarningTime] = useState(0);

  // Load Models
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Ensure TFJS is ready
        await tf.ready();
        
        const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
        
        // Load face-api models one by one to avoid parallel initialization issues
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        
        const objModel = await cocoSsd.load();
        setObjectModel(objModel);
        setModelsLoaded(true);
        console.log('Proctoring Models Loaded Successfully');
      } catch (error) {
        console.error('Error loading models:', error);
        // Sometimes parallel loading fails, try again once if failed
        setModelsLoaded(false);
      }
    };
    loadModels();
  }, []);

  // Trigger Warning
  const triggerWarning = useCallback(async (type, message) => {
    const now = Date.now();
    if (now - lastWarningTime < 3000) return; // Throttle warnings

    setLastWarningTime(now);
    setWarningActive(true);
    toast.error(message, {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#ef4444',
        color: '#fff',
        fontWeight: 'bold',
      }
    });

    // Log to backend
    try {
      await axios.post('http://localhost:5000/api/proctoring/log', {
        interviewId,
        type,
        message,
        timestamp: new Date()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to log warning:', error);
    }

    setTimeout(() => setWarningActive(false), 2000);
  }, [interviewId, token, lastWarningTime]);

  // Detection Loop
  useEffect(() => {
    let interval;
    if (modelsLoaded && webcamRef.current) {
      interval = setInterval(async () => {
        try {
          if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
            const video = webcamRef.current.video;

            // 1. Face Detection
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
            
            if (!detections || detections.length === 0) {
              triggerWarning('NO_FACE', 'No face detected! Please stay in view.');
            } else if (detections.length > 1) {
              triggerWarning('MULTIPLE_FACES', 'Multiple faces detected!');
            } else {
              const expressions = detections[0].expressions;
              const confidence = (expressions.happy || 0) + (expressions.neutral || 0);
              if (confidence < 0.3) {
                // Low confidence logic if needed
              }
            }

            // 2. Object Detection (Cell Phone)
            if (objectModel) {
              const predictions = await objectModel.detect(video);
              const phone = predictions.find(p => p.class === 'cell phone' && p.score > 0.6);
              if (phone) {
                triggerWarning('MOBILE_PHONE', 'Mobile phone detected! Please put it away.');
              }
            }
          }
        } catch (err) {
          console.error("Detection Loop Error:", err);
        }
      }, 800); // Slightly slower interval for better performance
    }
    return () => clearInterval(interval);
  }, [modelsLoaded, objectModel, triggerWarning]);

  // Tab Switch Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerWarning('TAB_SWITCH', 'Tab switching detected! This is logged.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [triggerWarning]);

  return (
    <Draggable nodeRef={nodeRef} bounds="parent">
      <div 
        ref={nodeRef} 
        className={`fixed bottom-6 right-6 z-[9999] cursor-move transition-all duration-300 ${warningActive ? 'scale-105' : 'scale-100'}`}
      >
        <div className={`relative p-1 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl border-2 transition-colors duration-300 ${warningActive ? 'border-red-500 shadow-red-500/40' : 'border-emerald-500 shadow-emerald-500/40'}`}>
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              width: 160,
              height: 120,
              facingMode: "user",
            }}
            className="rounded-xl w-40 h-30 object-cover"
          />
          
          {/* Overlay Labels */}
          <div className="absolute inset-0 pointer-events-none p-2 flex flex-col justify-between">
            <div className="flex justify-between">
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${warningActive ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                {warningActive ? 'Warning' : 'Secure'}
              </span>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-500" />
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="w-full bg-black/40 h-1 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${warningActive ? 'bg-red-500 w-full' : 'bg-emerald-500 w-[80%]'}`} />
              </div>
              <span className="text-[8px] text-white/80 font-medium">AI Proctoring Active</span>
            </div>
          </div>
        </div>
      </div>
    </Draggable>
  );
};

export default ProctoringMonitor;
