import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Lobby.css";

function Lobby() {
  const [codeBlocks, setCodeBlocks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/codeblocks")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch code blocks");
        }
        return res.json();
      })
      .then((data) => setCodeBlocks(data))
      .catch((err) => console.error("Error fetching code blocks:", err));
  }, []);

  return (
    <div className="lobby-container">
      <h1 className="lobby-title">Choose a Code Block</h1>
      <div className="lobby-cards">
        {codeBlocks.map((block) => (
          <div
            key={block._id}
            className="lobby-card"
            onClick={() => navigate(`/codeblock/${block._id}`)}
          >
            <h2 className="lobby-card-title">{block.name}</h2>
            <p className="lobby-card-description">
              Start working on the <strong>{block.name}</strong> code challenge!
            </p>
          </div>
        ))}
      </div>
      {/* Footer Section */}
      <footer className="lobby-footer">
        <p>Powered by Shai Angel</p>
      </footer>
    </div>
  );
}

export default Lobby;
