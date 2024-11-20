import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import MonacoEditor from "@monaco-editor/react";
import { io } from "socket.io-client";
import "./CodeBlock.css";

const socket = io("http://localhost:5000");

function CodeBlock() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState("// Start coding here...");
  const [role, setRole] = useState("");
  const [studentsCount, setStudentsCount] = useState(0);
  const [solution, setSolution] = useState("// Correct solution here");
  const [blockName, setBlockName] = useState("Loading...");
  const [smiley, setSmiley] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Join the room when the component mounts
    socket.emit("joinRoom", { roomId: id });

    // WebSocket event listeners
    const handleAssignRole = (assignedRole) => setRole(assignedRole);
    const handleCodeUpdate = (updatedCode) => setCode(updatedCode);
    const handleStudentCount = (count) => setStudentsCount(count);
    const handleMentorLeft = () => {
      alert("The mentor has left the session. Redirecting to the lobby...");
      navigate("/");
    };
    const handleReceiveMessage = (data) => {
      setMessages((prev) => [...prev, data]);
    };
    const handleChatHistory = (history) => {
      setMessages(history);
    };

    // Register WebSocket events
    socket.on("assignRole", handleAssignRole);
    socket.on("codeUpdate", handleCodeUpdate);
    socket.on("studentCount", handleStudentCount);
    socket.on("mentorLeft", handleMentorLeft);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("chatHistory", handleChatHistory);

    // Fetch code block data from the backend
    fetch(`http://localhost:5000/api/codeblocks/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch code block data");
        }
        return response.json();
      })
      .then((data) => {
        setCode(data.initialCode || "// No initial code provided.");
        setSolution(data.solution || "// No solution provided.");
        setBlockName(data.name || "Unnamed Code Block");
        setLoading(false);
      })
      .catch(() => {
        alert("Failed to load code block data. Redirecting to the lobby...");
        navigate("/");
      });

    // Cleanup when the component unmounts
    return () => {
      socket.emit("leaveRoom", { roomId: id });
      socket.off("assignRole", handleAssignRole);
      socket.off("codeUpdate", handleCodeUpdate);
      socket.off("studentCount", handleStudentCount);
      socket.off("mentorLeft", handleMentorLeft);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("chatHistory", handleChatHistory);
    };
  }, [id, navigate]);

  // Handle code changes in the editor
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId: id, code: newCode });
    setSmiley(newCode.trim() === solution.trim());
  };

  // Handle sending a message in the chat
  const sendMessage = () => {
    if (newMessage.trim()) {
      const messageData = { roomId: id, message: newMessage, sender: role };
      socket.emit("sendMessage", messageData); // Emit the message
      setNewMessage("");
    }
  };

  return (
    <div className="codeblock-container">
      {loading ? (
        <div className="loading">Loading Code Block...</div>
      ) : (
        <>
          <header className="codeblock-header">
            <h1 className="codeblock-title">{blockName}</h1>
            <div className="codeblock-info">
              <span>Role: {role}</span> | <span>Students in Room: {studentsCount}</span>
            </div>
          </header>
          <main className="codeblock-editor">
            {smiley && <div className="codeblock-smiley">😊</div>}
            <MonacoEditor
              height="500px"
              language="javascript"
              value={code}
              onChange={(value) => role.startsWith("Student") && handleCodeChange(value)}
              options={{
                readOnly: role === "mentor",
                theme: "vs-dark",
              }}
            />
          </main>
          <aside className="codeblock-chat">
            <div className="chat-messages">
              {messages.map((msg, index) => (
                <div key={index} className={`chat-message ${msg.sender}`}>
                  <strong>{msg.sender}:</strong> {msg.message}
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

export default CodeBlock;
