import React, { useState } from "react";

const TaskProgressForm = ({ task, onUpdated }) => {
  const [progress, setProgress] = useState(task.progress || 0);
  const [status, setStatus] = useState(task.status || "pending");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/tasks/${task._id}/progress`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ progress, status }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update progress");
      }
      setMessage({ type: "success", text: "Progress updated!" });
      if (onUpdated) onUpdated();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: "0 auto" }}>
      <h3>Update Task Progress</h3>
      {message && (
        <div style={{ color: message.type === "error" ? "red" : "green" }}>
          {message.text}
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        <label>Progress (%)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ width: "100%" }}
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <button type="submit" disabled={loading} style={{ width: "100%" }}>
        {loading ? "Updating..." : "Update Progress"}
      </button>
    </form>
  );
};

export default TaskProgressForm;
