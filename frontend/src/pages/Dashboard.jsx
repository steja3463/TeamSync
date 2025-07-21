import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../useAuth";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Chip,
  Box,
  Typography,
  Paper,
} from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import { useTheme } from "../ThemeContext";

// Placeholder functions for fetching data (to be implemented)
const fetchProjects = async (role) => [];
const fetchMeetings = async (role) => [];
const fetchNotifications = async (role) => [];

function MemberDashboardContent({
  projects,
  meetings,
  notifications,
  user,
  onJoinProject, // new prop
}) {
  const { theme } = useTheme();
  const cardBg =
    theme === "dark"
      ? "linear-gradient(135deg, #232946 0%, #121629 100%)"
      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  const cardText = theme === "dark" ? "#fff" : "white";
  const cardBg2 =
    theme === "dark"
      ? "linear-gradient(135deg, #393e46 0%, #232946 100%)"
      : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)";
  const cardBg3 =
    theme === "dark"
      ? "linear-gradient(135deg, #232946 0%, #393e46 100%)"
      : "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
  const boxBg = theme === "dark" ? "#181823" : "white";
  const boxText = theme === "dark" ? "#e5e5e5" : "#333";

  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");
  const [joinRequests, setJoinRequests] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const prevRequestsRef = useRef([]);
  const navigate = useNavigate();
  const [currentProjectsOpen, setCurrentProjectsOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskStatus, setTaskStatus] = useState("");
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState("");

  // Fetch member's tasks for progress update (assume tasks are fetched per project)
  const fetchMemberTasks = async (projectId) => {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `http://localhost:5000/api/tasks?project=${projectId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      // Only return tasks assigned to this user
      return data.filter(
        (t) =>
          t.assignedTo &&
          (t.assignedTo._id === user.id || t.assignedTo === user.id)
      );
    }
    return [];
  };

  const handleOpenProgressDialog = (task) => {
    setSelectedTask(task);
    setTaskProgress(task.progress || 0);
    setTaskStatus(task.status || "");
    setProgressDialogOpen(true);
  };

  const handleUpdateProgress = async () => {
    setProgressLoading(true);
    setProgressError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/tasks/${selectedTask._id}/progress`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ progress: taskProgress, status: taskStatus }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update progress");
      }
      setProgressDialogOpen(false);
    } catch (err) {
      setProgressError(err.message);
    } finally {
      setProgressLoading(false);
    }
  };

  // Fetch join requests
  const fetchJoinRequests = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(
      "http://localhost:5000/api/projects/my-join-requests",
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      setJoinRequests(data);
    }
  };
  useEffect(() => {
    fetchJoinRequests();
  }, []);

  // Show popup if any request status changes to 'approved' or 'rejected'
  useEffect(() => {
    if (prevRequestsRef.current.length > 0) {
      joinRequests.forEach((req, i) => {
        const prev = prevRequestsRef.current.find(
          (r) => r.projectId === req.projectId
        );
        if (prev && prev.status !== req.status && req.status !== "pending") {
          // Add notification
          setNotifications((prevNotifs) => [
            {
              id: `${req.projectId}-${req.status}`,
              message: `Your join request to ${req.projectName} was ${
                req.status === "approved" ? "approved" : "rejected"
              }.`,
              type: req.status === "approved" ? "success" : "error",
              date: new Date().toISOString(),
            },
            ...prevNotifs,
          ]);
        }
      });
    }
    prevRequestsRef.current = joinRequests;
  }, [joinRequests]);

  const handleJoinProject = async () => {
    setJoinLoading(true);
    setJoinError("");
    setJoinSuccess("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        "http://localhost:5000/api/projects/join-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ joinCode }),
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to send join request");
      setJoinSuccess("Join request sent! Awaiting admin approval.");
      setJoinCode("");
      setJoinModalOpen(false);
      if (onJoinProject) onJoinProject();
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <>
      {/* Your Projects Section */}
      <Box mb={3}>
        <Typography variant="h6" fontWeight={700} mb={1}>
          Your Projects
        </Typography>
        {projects.length === 0 ? (
          <Typography color="text.secondary">
            You are not a member of any projects yet.
          </Typography>
        ) : (
          projects.map((project) => (
            <Paper key={project._id} sx={{ p: 2, mb: 1, borderRadius: 2 }}>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography fontWeight={600}>{project.name}</Typography>
                  <Typography color="text.secondary" fontSize={14}>
                    {project.description || "No description."}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Status: {project.status}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/dashboard/projects/${project._id}`)}
                  sx={{ ml: 2 }}
                >
                  View Details
                </Button>
              </Box>
            </Paper>
          ))
        )}
      </Box>
      {/* Join Project Button and Refresh */}
      <Button
        variant="contained"
        color="primary"
        sx={{ mb: 2 }}
        onClick={() => setJoinModalOpen(true)}
      >
        Join Project
      </Button>
      <Button
        variant="outlined"
        color="secondary"
        sx={{ mb: 2, ml: 2 }}
        onClick={fetchJoinRequests}
      >
        Refresh
      </Button>
      {/* View Current Projects Button */}
      <Button
        variant="outlined"
        color="primary"
        sx={{ mb: 2, mr: 2 }}
        onClick={() => setCurrentProjectsOpen(true)}
      >
        View Current Projects
      </Button>
      {/* Current Projects Modal */}
      <Dialog
        open={currentProjectsOpen}
        onClose={() => setCurrentProjectsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Your Projects</DialogTitle>
        <DialogContent>
          {projects.length === 0 ? (
            <Typography color="text.secondary">
              You are not a member of any projects yet.
            </Typography>
          ) : (
            projects.map((project) => (
              <Paper key={project._id} sx={{ p: 2, mb: 2, borderRadius: 3 }}>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography fontWeight={600}>{project.name}</Typography>
                    <Typography color="text.secondary" fontSize={14}>
                      {project.description || "No description."}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Status: {project.status}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={2}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setCurrentProjectsOpen(false);
                        navigate(`/dashboard/projects/${project._id}`);
                      }}
                    >
                      View Details
                    </Button>
                    {/* Fetch and show update progress if member has tasks in this project */}
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={async () => {
                        const tasks = await fetchMemberTasks(project._id);
                        if (tasks.length > 0) {
                          handleOpenProgressDialog(tasks[0]); // For now, just first task
                        } else {
                          alert("No tasks assigned to you in this project.");
                        }
                      }}
                    >
                      Update Progress
                    </Button>
                  </Box>
                </Box>
              </Paper>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCurrentProjectsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* Update Progress Dialog */}
      <Dialog
        open={progressDialogOpen}
        onClose={() => setProgressDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Update Task Progress</DialogTitle>
        <DialogContent>
          <Typography fontWeight={600} mb={1}>
            {selectedTask?.title}
          </Typography>
          <TextField
            label="Progress (%)"
            type="number"
            value={taskProgress}
            onChange={(e) => setTaskProgress(Number(e.target.value))}
            fullWidth
            margin="normal"
            inputProps={{ min: 0, max: 100 }}
          />
          <TextField
            label="Status"
            value={taskStatus}
            onChange={(e) => setTaskStatus(e.target.value)}
            fullWidth
            margin="normal"
          />
          {progressError && (
            <Typography color="error.main">{progressError}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setProgressDialogOpen(false)}
            disabled={progressLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateProgress}
            variant="contained"
            disabled={progressLoading}
          >
            {progressLoading ? "Updating..." : "Update"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Join Project</DialogTitle>
        <DialogContent>
          <TextField
            label="Enter Join Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            fullWidth
            margin="normal"
            autoFocus
          />
          {joinError && <Typography color="error.main">{joinError}</Typography>}
          {joinSuccess && (
            <Typography color="success.main">{joinSuccess}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setJoinModalOpen(false)}
            disabled={joinLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoinProject}
            variant="contained"
            disabled={joinLoading || !joinCode}
          >
            {joinLoading ? "Joining..." : "Join"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Your Join Requests Section */}
      <Box mb={3}>
        <Typography variant="h6" fontWeight={700} mb={1}>
          Your Join Requests
        </Typography>
        {joinRequests.length === 0 ? (
          <Typography color="text.secondary">No join requests yet.</Typography>
        ) : (
          joinRequests.map((req) => (
            <Paper key={req.projectId} sx={{ p: 2, mb: 1, borderRadius: 2 }}>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography fontWeight={600}>{req.projectName}</Typography>
                <Typography
                  color={
                    req.status === "pending"
                      ? "warning.main"
                      : req.status === "approved"
                      ? "success.main"
                      : "error.main"
                  }
                >
                  {req.status === "pending"
                    ? "Waiting for admin to accept"
                    : req.status === "approved"
                    ? "Accepted by admin"
                    : "Rejected by admin"}
                </Typography>
              </Box>
            </Paper>
          ))
        )}
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          onClose={() => setSnackbarOpen(false)}
          severity="success"
        >
          {snackbarMsg}
        </MuiAlert>
      </Snackbar>
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ margin: "15px 0 0 0", fontSize: "32px", color: boxText }}>
          Welcome back,{user.name}
        </h2>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "25px",
          marginBottom: "30px",
        }}
      >
        <div
          style={{
            background: cardBg,
            color: cardText,
            padding: "30px",
            borderRadius: "15px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <span style={{ fontSize: "30px", marginRight: "10px" }}>📈</span>
            <h3 style={{ margin: 0, fontSize: "18px" }}>Ongoing Projects</h3>
          </div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            {projects.length}
          </div>
          <p style={{ margin: 0, opacity: 0.8, fontSize: "14px" }}>
            Active projects in progress
          </p>
        </div>
        <div
          style={{
            background: cardBg2,
            color: cardText,
            padding: "30px",
            borderRadius: "15px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <span style={{ fontSize: "30px", marginRight: "10px" }}>✅</span>
            <h3 style={{ margin: 0, fontSize: "18px" }}>Completed Projects</h3>
          </div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            {projects.filter((p) => p.completed).length}
          </div>
          <p style={{ margin: 0, opacity: 0.8, fontSize: "14px" }}>
            Successfully delivered
          </p>
        </div>
        <div
          style={{
            background: cardBg3,
            color: cardText,
            padding: "30px",
            borderRadius: "15px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <span style={{ fontSize: "30px", marginRight: "10px" }}>⏰</span>
            <h3 style={{ margin: 0, fontSize: "18px" }}>Upcoming Meetings</h3>
          </div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            {meetings.length}
          </div>
          <p style={{ margin: 0, opacity: 0.8, fontSize: "14px" }}>
            Scheduled for this week
          </p>
        </div>
      </div>
      <div
        style={{
          backgroundColor: boxBg,
          borderRadius: "15px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          padding: "30px",
          color: boxText,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <span style={{ fontSize: "24px", marginRight: "10px" }}>📅</span>
          <h3 style={{ margin: 0, fontSize: "20px" }}>Upcoming Meetings</h3>
        </div>
        {meetings.length === 0 ? (
          <div style={{ color: "#888" }}>No upcoming meetings.</div>
        ) : (
          meetings.map((meet, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "15px 0",
                borderBottom:
                  index < meetings.length - 1 ? "1px solid #eee" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: "20px", marginRight: "15px" }}>
                  🎥
                </span>
                <div>
                  <h4 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>
                    {meet.title}
                  </h4>
                  <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                    {meet.date} at {meet.time}
                  </p>
                </div>
              </div>
              <button
                style={{
                  backgroundColor: "#1976d2",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Join
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function CreateProjectModal({ open, onClose, onCreate, user }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          createdBy: user.id || user._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create project");
      onCreate(data.project);
      setName("");
      setDescription("");
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Project</DialogTitle>
      <DialogContent>
        <TextField
          label="Project Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          required
          margin="normal"
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={3}
          margin="normal"
        />
        {error && (
          <Box color="error.main" mt={1}>
            {error}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !name}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ProjectDetailsModal({ open, onClose, projectId }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    fetch(`http://localhost:5000/api/projects/${projectId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data._id) setProject(data);
        else setError(data.message || "Project not found");
      })
      .catch(() => setError("Failed to fetch project details."))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Project Details</DialogTitle>
      <DialogContent>
        {loading ? (
          <Typography>Loading...</Typography>
        ) : error ? (
          <Typography color="error.main">{error}</Typography>
        ) : project ? (
          <Box>
            <Typography variant="h5" fontWeight={700} mb={1}>
              {project.name}
            </Typography>
            <Typography color="text.secondary" mb={2}>
              {project.description || "No description."}
            </Typography>
            <Typography variant="subtitle1" fontWeight={600}>
              Status: <Chip label={project.status} size="small" />
            </Typography>
            <Typography variant="subtitle2" mt={2} mb={1}>
              Members:
            </Typography>
            {project.members && project.members.length > 0 ? (
              <Box display="flex" gap={1} flexWrap="wrap">
                {project.members.map((m) => (
                  <Chip
                    key={m._id}
                    label={m.name + (m.email ? ` (${m.email})` : "")}
                  />
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">No members yet.</Typography>
            )}
            <Typography variant="subtitle2" mt={2} mb={1}>
              Created At: {new Date(project.createdAt).toLocaleString()}
            </Typography>
            {/* Add more project details, meetings, actions here */}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function CurrentProjectsModal({ open, onClose, projects, onViewJoinRequests }) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Current Projects</DialogTitle>
      <DialogContent>
        {projects.length === 0 ? (
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            No projects found. Create a new project to get started!
          </Typography>
        ) : (
          <Box sx={{ mt: 1 }}>
            {projects.map((project) => (
              <Paper
                key={project._id || project.id}
                sx={{ p: 2, mb: 2, borderRadius: 3, position: "relative" }}
              >
                <Typography
                  variant="h6"
                  fontWeight={700}
                  mb={0.5}
                  sx={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => {
                    onClose();
                    navigate(
                      `/dashboard/projects/${project._id || project.id}`
                    );
                  }}
                >
                  {project.name}
                </Typography>
                <Typography color="text.secondary" mb={1}>
                  {project.description || "No description."}
                </Typography>
                <Box display="flex" gap={2} alignItems="center">
                  <Chip
                    label={project.status || "active"}
                    color={
                      project.status === "completed"
                        ? "success"
                        : project.status === "archived"
                        ? "default"
                        : "primary"
                    }
                    size="small"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Created:{" "}
                    {project.createdAt
                      ? new Date(project.createdAt).toLocaleDateString()
                      : "N/A"}
                  </Typography>
                  {/* Show join requests count if available */}
                  {project.joinRequests &&
                    project.joinRequests.filter((jr) => jr.status === "pending")
                      .length > 0 && (
                      <Chip
                        label={`${
                          project.joinRequests.filter(
                            (jr) => jr.status === "pending"
                          ).length
                        } Pending Join Request(s)`}
                        color="warning"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  {onViewJoinRequests &&
                    project.joinRequests &&
                    project.joinRequests.filter((jr) => jr.status === "pending")
                      .length > 0 && (
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ ml: 1 }}
                        onClick={() => onViewJoinRequests(project)}
                      >
                        View Join Requests
                      </Button>
                    )}
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function AdminDashboardContent({
  projects,
  meetings,
  notifications,
  user,
  theme,
  onProjectCreated,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [joinRequestsModalOpen, setJoinRequestsModalOpen] = useState(false);
  const cardBg =
    theme === "dark"
      ? "linear-gradient(135deg, #232946 0%, #121629 100%)"
      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  const cardText = theme === "dark" ? "#fff" : "white";
  const cardBg2 =
    theme === "dark"
      ? "linear-gradient(135deg, #393e46 0%, #232946 100%)"
      : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)";
  const cardBg3 =
    theme === "dark"
      ? "linear-gradient(135deg, #232946 0%, #393e46 100%)"
      : "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)";
  const boxBg = theme === "dark" ? "#181823" : "white";
  const boxText = theme === "dark" ? "#e5e5e5" : "#333";

  return (
    <>
      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={onProjectCreated}
        user={user}
      />
      <CurrentProjectsModal
        open={projectsModalOpen}
        onClose={() => setProjectsModalOpen(false)}
        projects={projects}
        onViewJoinRequests={(project) => {
          setSelectedProject(project);
          setJoinRequestsModalOpen(true);
        }}
      />
      {/* Join Requests Modal for selected project (to be implemented) */}
      <Dialog
        open={joinRequestsModalOpen}
        onClose={() => setJoinRequestsModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Join Requests for {selectedProject?.name}</DialogTitle>
        <DialogContent>
          {selectedProject?.joinRequests?.length === 0 ? (
            <Typography color="text.secondary">
              No pending join requests for this project.
            </Typography>
          ) : (
            selectedProject?.joinRequests?.map((req) => (
              <Paper key={req._id} sx={{ p: 2, mb: 1, borderRadius: 2 }}>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography fontWeight={600}>{req.requesterName}</Typography>
                  <Typography
                    color={
                      req.status === "pending"
                        ? "warning.main"
                        : req.status === "approved"
                        ? "success.main"
                        : "error.main"
                    }
                  >
                    {req.status}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Requested on: {new Date(req.requestedAt).toLocaleDateString()}
                </Typography>
              </Paper>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinRequestsModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ margin: "15px 0 0 0", fontSize: "32px", color: boxText }}>
          Welcome back, {user?.name || "Admin"}!
        </h2>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "25px",
          marginBottom: "30px",
        }}
      >
        <div
          style={{
            background: cardBg,
            color: cardText,
            padding: "30px",
            borderRadius: "15px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <span style={{ fontSize: "30px", marginRight: "10px" }}>📈</span>
            <h3 style={{ margin: 0, fontSize: "18px" }}>
              Total Ongoing Projects
            </h3>
          </div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            {projects.length}
          </div>
          <p style={{ margin: 0, opacity: 0.8, fontSize: "14px" }}>
            Across all teams
          </p>
        </div>
        <div
          style={{
            background: cardBg2,
            color: cardText,
            padding: "30px",
            borderRadius: "15px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <span style={{ fontSize: "30px", marginRight: "10px" }}>✅</span>
            <h3 style={{ margin: 0, fontSize: "18px" }}>
              Total Completed Projects
            </h3>
          </div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            {projects.filter((p) => p.completed).length}
          </div>
          <p style={{ margin: 0, opacity: 0.8, fontSize: "14px" }}>
            Successfully delivered
          </p>
        </div>
        <div
          style={{
            background: cardBg3,
            color: cardText,
            padding: "30px",
            borderRadius: "15px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <span style={{ fontSize: "30px", marginRight: "10px" }}>📹</span>
            <h3 style={{ margin: 0, fontSize: "18px" }}>Schedule a Meeting</h3>
          </div>
          <button
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              color: "white",
              border: "2px solid rgba(255,255,255,0.3)",
              padding: "12px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              marginTop: "10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>➕</span> New Meeting
          </button>
          <p style={{ margin: "10px 0 0 0", opacity: 0.8, fontSize: "14px" }}>
            Schedule team meetings
          </p>
        </div>
      </div>
      <div
        style={{
          backgroundColor: boxBg,
          borderRadius: "15px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          padding: "30px",
          color: boxText,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "25px",
          }}
        >
          <span style={{ fontSize: "24px", marginRight: "10px" }}>🎛️</span>
          <h3 style={{ margin: 0, fontSize: "20px" }}>Admin Actions</h3>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
          }}
        >
          <button
            style={{
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              transition: "transform 0.2s",
            }}
            onClick={() => setModalOpen(true)}
          >
            <span>➕</span> Create Project
          </button>
          <button
            style={{
              backgroundColor: "#4e54c8",
              color: "white",
              border: "none",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              transition: "transform 0.2s",
            }}
            onClick={() => setProjectsModalOpen(true)}
          >
            <span>📁</span> View Current Projects
          </button>
          <button
            style={{
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              transition: "transform 0.2s",
            }}
          >
            <span>👥</span> Manage Teams
          </button>
          <button
            style={{
              backgroundColor: "#ff9800",
              color: "white",
              border: "none",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              transition: "transform 0.2s",
            }}
          >
            <span>📊</span> View Reports
          </button>
          <button
            style={{
              backgroundColor: "#9c27b0",
              color: "white",
              border: "none",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              transition: "transform 0.2s",
            }}
          >
            <span>🎥</span> Schedule Meeting
          </button>
        </div>
      </div>
    </>
  );
}

const TeamSyncDashboard = () => {
  const { user, role, setRole, logout } = useAuth();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchProjects = async () => {
      const token = localStorage.getItem("token");
      let url = "";
      if (role === "admin") {
        url = "http://localhost:5000/api/projects/mine";
      } else {
        url = "http://localhost:5000/api/projects/member-projects";
      }
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    };
    fetchProjects();
    fetchMeetings(role).then(setMeetings);
    fetchNotifications(role).then(setNotifications);
  }, [role]);

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        backgroundColor: theme === "dark" ? "#181823" : "#f5f5f5",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        margin: 0,
        padding: 0,
      }}
    >
      {/* Top Navigation Bar */}
      <nav
        style={{
          backgroundColor: "#1976d2",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          color: "white",
          width: "98vw",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            style={{
              background: "none",
              border: "none",
              color: "white",
              fontSize: "24px",
              cursor: "pointer",
              marginRight: "20px",
            }}
          >
            ☰
          </button>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "bold" }}>
            TeamSync
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            style={{
              background: "none",
              border: "none",
              color: "white",
              fontSize: "1.7rem",
              cursor: "pointer",
              marginRight: "8px",
            }}
            title="Toggle theme"
          >
            {theme === "dark" ? "🌞" : "🌙"}
          </button>
          {/* Notifications */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setNotificationMenuOpen(!notificationMenuOpen)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                fontSize: "24px",
                cursor: "pointer",
                position: "relative",
              }}
            >
              🔔
              <span
                style={{
                  position: "absolute",
                  top: "-5px",
                  right: "-5px",
                  backgroundColor: "#f44336",
                  color: "white",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {notifications.length}
              </span>
            </button>
            {notificationMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  backgroundColor: "white",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  width: "350px",
                  zIndex: 1000,
                  color: "#333",
                }}
              >
                <div
                  style={{ padding: "15px", borderBottom: "1px solid #eee" }}
                >
                  <h3 style={{ margin: 0, fontSize: "18px" }}>Notifications</h3>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: "15px", color: "#888" }}>
                    No notifications.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      style={{
                        padding: "15px",
                        borderBottom: "1px solid #eee",
                        cursor: "pointer",
                      }}
                    >
                      <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>
                        {notification.message}
                      </p>
                      <small style={{ color: "#666" }}>
                        {notification.time}
                      </small>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {/* Profile Menu */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              style={{
                background: "#ff9800",
                border: "none",
                color: "white",
                fontSize: "16px",
                cursor: "pointer",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {role === "admin" ? "A" : "M"}
            </button>
            {profileMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  backgroundColor: theme === "white" ? "white" : "#181823",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  width: "200px",
                  zIndex: 1000,
                  color: "#333",
                }}
              >
                <button
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "none",
                    color: "white",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  👤 Profile
                </button>
                <button
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    color: "white",
                    gap: "10px",
                  }}
                >
                  ⚙️ Settings
                </button>
                <hr
                  style={{
                    margin: "8px 0",
                    border: "none",
                    borderTop: "1px solid #eee",
                  }}
                />
                <button
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    color: "white",
                    alignItems: "center",
                    gap: "10px",
                  }}
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      {/* Main Content */}
      <div
        style={{
          width: "100vw",
          height: "calc(100vh - 64px)",
          marginTop: "64px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            width: "100%",
            padding: "30px 20px",
            boxSizing: "border-box",
          }}
        >
          {role === "member" && (
            <MemberDashboardContent
              projects={projects}
              meetings={meetings}
              notifications={notifications}
              user={user}
              onJoinProject={() => {
                // This function will be implemented to refetch projects
                // For now, it just closes the modal
                setProjects((prev) => [...prev]);
              }}
            />
          )}
          {role === "admin" && (
            <AdminDashboardContent
              projects={projects}
              meetings={meetings}
              notifications={notifications}
              user={user}
              theme={theme}
              onProjectCreated={(project) =>
                setProjects((prev) => [project, ...prev])
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamSyncDashboard;
