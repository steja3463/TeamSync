const express = require("express");
const Task = require("../models/Task");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Middleware to check JWT and set req.user
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// Admin: Create a new task
router.post("/", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admin can create tasks" });
  }
  try {
    const { title, description, assignedTo } = req.body;
    if (!title || !assignedTo) {
      return res
        .status(400)
        .json({ message: "Title and assignedTo are required" });
    }
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({ message: "Assigned user not found" });
    }
    const task = new Task({
      title,
      description,
      assignedTo,
      createdBy: req.user.userId,
    });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: Update a task (title, description, assignedTo, status, progress)
router.put("/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admin can update tasks" });
  }
  try {
    const { title, description, assignedTo, status, progress } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;
    if (status !== undefined) task.status = status;
    if (progress !== undefined) task.progress = progress;
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: Delete a task
router.delete("/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admin can delete tasks" });
  }
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Member: Update progress/status of their assigned task
router.patch("/:id/progress", authMiddleware, async (req, res) => {
  if (req.user.role !== "member") {
    return res
      .status(403)
      .json({ message: "Only members can update progress" });
  }
  try {
    const { progress, status } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (String(task.assignedTo) !== req.user.userId) {
      return res.status(403).json({ message: "Not your assigned task" });
    }
    if (progress !== undefined) task.progress = progress;
    if (status !== undefined) task.status = status;
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all tasks (admin: all, member: only assigned)
router.get("/", authMiddleware, async (req, res) => {
  try {
    let tasks;
    if (req.user.role === "admin") {
      tasks = await Task.find().populate(
        "assignedTo createdBy",
        "name email role"
      );
    } else {
      tasks = await Task.find({ assignedTo: req.user.userId }).populate(
        "assignedTo createdBy",
        "name email role"
      );
    }
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get a single task (admin: any, member: only assigned)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(
      "assignedTo createdBy",
      "name email role"
    );
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (
      req.user.role === "member" &&
      String(task.assignedTo) !== req.user.userId
    ) {
      return res.status(403).json({ message: "Not your assigned task" });
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
