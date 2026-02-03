import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

// Detect if we're on a touch device
const isTouchDevice = () => {
  return ('ontouchstart' in window) ||
         (navigator.maxTouchPoints > 0) ||
         (navigator.msMaxTouchPoints > 0);
};

const CalendarDndProvider = ({ children }) => {
  const backend = isTouchDevice() ? TouchBackend : HTML5Backend;

  const backendOptions = isTouchDevice() ? {
    enableMouseEvents: true,
    delayTouchStart: 200,
    ignoreContextMenu: true,
    enableTouchEvents: true,
    delay: 0,
    tolerance: 5,
    scrollAngleRanges: [
      { start: 30, end: 150 },
      { start: 210, end: 330 }
    ]
  } : {};

  return (
    <DndProvider backend={backend} options={backendOptions}>
      {children}
    </DndProvider>
  );
};

export default CalendarDndProvider;