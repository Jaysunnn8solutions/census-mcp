const MCP_URL = "https://census-mcp.vercel.app/mcp";
const REPO_URL = "https://github.com/Jaysunnn8solutions/census-mcp";

const TOOLS = [
  {
    name: "list_vintages",
    desc: "Reports which ACS data years are available and which is most recent. Discovered from the Census catalog at runtime, not hardcoded.",
  },
  {
    name: "resolve_geography",
    desc: "Converts a place name into the FIPS codes required to query data. Returns every candidate rather than guessing — county names repeat across states.",
  },
  {
    name: "search_columns",
    desc: "Finds variable codes by plain-language keyword across roughly 28,000 variables per vintage, ranked by relevance.",
  },
];

const NOTES = [
  {
    title: "Discovery over enumeration",
    body: "A single ACS vintage publishes about 28,000 variables. No model can hold that in context, so the server exposes search rather than a schema dump.",
  },
  {
    title: "Ambiguity is returned, not resolved",
    body: "Geography lookups return all matching candidates. Guessing which DeKalb County someone meant would produce confident wrong answers.",
  },
  {
    title: "Read-only by construction",
    body: "Every tool is annotated read-only and there is no write path. The Census API key is held server-side, so nobody connecting needs a credential.",
  },
  {
    title: "Bounded resources",
    body: "Variable catalogs are roughly 10 MB each and cached per process with capped eviction. All outbound requests carry hard timeouts so a slow upstream fails legibly instead of hitting the platform limit.",
  },
  {
    title: "Defaults are stated, not silent",
    body: "When a vintage is omitted the server uses the newest available and says so in the response, so the model can surface or override the assumption.",
  },
];

export default function Home() {
  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <p className="masthead-title">Census MCP</p>
          <span className="masthead-sub">
            American Community Survey · Model Context Protocol
          </span>
        </div>
      </header>

      <div className="hero">
        <div className="hero-inner">
          <h1>U.S. Census data, queryable in conversation.</h1>
          <p>
            An MCP server that gives Claude structured access to American
            Community Survey estimates — geography resolution, variable
            discovery, and data retrieval, without leaving the chat.
          </p>

          <div className="stat-row">
            <div>
              <div className="stat-value">28,475</div>
              <div className="stat-label">Variables per vintage</div>
            </div>
            <div>
              <div className="stat-value">2009–2024</div>
              <div className="stat-label">Years covered</div>
            </div>
            <div>
              <div className="stat-value">3,144</div>
              <div className="stat-label">Counties</div>
            </div>
          </div>
        </div>
      </div>

      <section>
        <p className="eyebrow">Getting started</p>
        <h2>Connect it to Claude</h2>
        <p>
          The server is authless and read-only. No account, API key, or local
          install is required on your end.
        </p>
        <div className="url-box">{MCP_URL}</div>
        <ol className="steps">
          <li>
            In Claude, open <strong>Settings → Connectors</strong> and choose{" "}
            <strong>Add custom connector</strong>.
          </li>
          <li>Paste the URL above. Leave the OAuth fields empty.</li>
          <li>
            Enable the connector in a conversation using the{" "}
            <strong>+</strong> button.
          </li>
          <li>
            Ask a question, for example:{" "}
            <em>
              &ldquo;What is the median household income in DeKalb County,
              Georgia?&rdquo;
            </em>
          </li>
        </ol>
        <p style={{ marginTop: "1.5rem", fontSize: "0.9rem" }}>
          Using Claude Code instead? Run{" "}
          <code>claude mcp add --transport http census {MCP_URL}</code>
        </p>
      </section>

      <section>
        <p className="eyebrow">Interface</p>
        <h2>Tools</h2>
        <div className="tools">
          {TOOLS.map((t) => (
            <div className="tool" key={t.name}>
              <div className="tool-name">{t.name}</div>
              <div className="tool-desc">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="eyebrow">Engineering</p>
        <h2>Design decisions</h2>
        <ul className="notes">
          {NOTES.map((n) => (
            <li key={n.title}>
              <strong>{n.title}.</strong> {n.body}
            </li>
          ))}
        </ul>
      </section>

      <footer>
        <div className="footer-inner">
          <span>
            Data from the U.S. Census Bureau American Community Survey. Public
            domain (CC0).
          </span>
          <a href={REPO_URL}>Source on GitHub →</a>
        </div>
      </footer>
    </>
  );
}