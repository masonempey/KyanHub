const backgroundContainer = ({ width, height, color }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: width || "100%",
        height: height || "100%",
        zIndex: 1,
        backgroundColor: color || "rgba(255, 255, 255, 0.8)",
        borderColor: "rgba(110, 127, 128, 0.3)",
        borderStyle: "solid",
        borderWidth: "1px",
        borderRadius: "10px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
      }}
    />
  );
};

export default backgroundContainer;
