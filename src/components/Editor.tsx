import React, { useState, useEffect, useRef } from "react";
import { Button, Col, Container, Dropdown, Row } from "react-bootstrap";
import AceEditor from "react-ace";
import { supportedLanguages, supportedThemes } from "@/utils/imports";
import { getModeForExtension } from "@/utils/extentions";
interface EditorProps {
  fileContent: string;
  fileExtension: string;
}

const CodeEditor: React.FC<EditorProps> = ({ fileContent, fileExtension }) => {
  const [theme, setTheme] = useState<string>("monokai");
  const [code, setCode] = useState<string>("");
  const [responseData, setResponseData] = useState<any>(null);

  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    ws.current = new WebSocket("ws://localhost:8000/ws");

    // Set up event listeners
    ws.current.onopen = () => {
      console.log("Connected to WebSocket server");
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      // Update local state with new code received from the server
      setCode(message.content);
    };

    ws.current.onclose = () => {
      console.log("Disconnected from WebSocket server");
    };

    // Clean up WebSocket connection
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);
  useEffect(() => {
    // Send initial file extension to the backend
    if (ws.current && fileExtension) {
      const message = { fileExtension };
      ws.current.send(JSON.stringify(message));
    }
  }, [fileExtension]);

  const mode = getModeForExtension(fileExtension);
  const selectedThemeLabel =
    supportedThemes.find((t) => t.value === theme)?.label || "Select Theme";
  useEffect(() => {
    setCode(fileContent || "");
  }, [fileContent]);
  const handleSubmit = async () => {
    try {
      const response = await fetch("http://localhost:5000/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: fileExtension, // Assuming fileExtension is defined elsewhere in your code
          code: code, // Assuming code is defined elsewhere in your code
        }),
      });
      console.log(fileExtension);
      console.log(code);

      const data = await response.json();
      setResponseData(data);
      // Here you can do something with the response, such as displaying it
    } catch (error) {
      console.error("Error:", error);
    }
  };
  return (
    <Container fluid>
      <Row className="mt-3">
        <Col>
          <Dropdown className="ml-3">
            <Dropdown.Toggle variant="primary" id="theme-dropdown">
              {selectedThemeLabel}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {supportedThemes.map((theme) => (
                <Dropdown.Item
                  key={theme.value}
                  onClick={() => setTheme(theme.value)}
                >
                  {theme.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </Col>
        <Col>
          <Button variant="success" onClick={handleSubmit}>
            RUN
          </Button>
        </Col>
      </Row>

      <Row className="mt-3">
        <Col>
          <AceEditor
            mode={mode}
            theme={theme}
            name="code-editor"
            editorProps={{ $blockScrolling: true }}
            width="100%"
            showGutter={true}
            fontSize={16}
            value={code !== "" ? code : fileContent}
            onChange={(newCode) => {
              // Send code changes to WebSocket server
              setCode(newCode);
              if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                const message = {
                  content: newCode,
                };
                ws.current.send(JSON.stringify(message));
              }
            }}
          />
        </Col>
      </Row>
      <Col>
        <pre>{JSON.stringify(responseData, null, 2)}</pre>
      </Col>
    </Container>
  );
};

export default CodeEditor;
