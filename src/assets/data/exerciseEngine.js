export const DETECTORS = {
  FLAG: (marks) => {
    const leftHand = marks[15],
      rightHand = marks[16];
    if (leftHand?.visibility > 0.8) return "right";
    if (rightHand?.visibility > 0.8) return "left";
    return null;
  },
  HEAD: (marks) => {
    const lEye1 = marks[2],
      rEye0 = marks[4];
    if (lEye1.x < 0.45) return "left";
    if (rEye0.x > 0.55) return "right";
    return null;
  },
  GRAB: (multiHandMarks) => {
    if (!multiHandMarks || multiHandMarks.length === 0) return null;
    for (const marks of multiHandMarks) {
      const isClosed =
        marks[8].y > marks[5].y &&
        marks[12].y > marks[9].y &&
        marks[16].y > marks[13].y &&
        marks[20].y > marks[17].y;
      if (isClosed) return marks[0].x < 0.5 ? "left" : "right";
    }
    return null;
  },
};
