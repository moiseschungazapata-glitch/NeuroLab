const nodes = [0, 1, 2, 3].flatMap(column =>
  [0, 1, 2, 3].map(row => ({column, row, x: 65 + column * 95, y: 40 + row * 52})),
);

const connections = nodes.flatMap(node =>
  nodes
    .filter(target => target.column === node.column + 1)
    .map(target => ({
      column: node.column,
      d: `M ${node.x} ${node.y} C ${node.x + 43} ${node.y}, ${target.x - 43} ${target.y}, ${target.x} ${target.y}`,
    })),
);

export function DashboardNetwork() {
  return <figure className="network-art" aria-label="Red neuronal animada con señales que avanzan entre sus capas">
    <svg viewBox="0 0 420 240" aria-hidden="true">
      <defs>
        <radialGradient id="dashboard-network-glow"><stop stopColor="#b4ecd2" stopOpacity=".35"/><stop offset="1" stopColor="#b4ecd2" stopOpacity="0"/></radialGradient>
        <linearGradient id="dashboard-network-signal"><stop stopColor="#d9f4b9"/><stop offset="1" stopColor="#8ed5ab"/></linearGradient>
      </defs>
      <circle className="dashboard-network-halo" cx="220" cy="120" r="130" fill="url(#dashboard-network-glow)"/>
      <ellipse className="dashboard-network-orbit dashboard-network-orbit-a" cx="207" cy="118" rx="174" ry="104"/>
      <ellipse className="dashboard-network-orbit dashboard-network-orbit-b" cx="207" cy="118" rx="139" ry="115"/>
      {connections.map((connection, index) => <path key={'connection-'+index} d={connection.d} className="dashboard-network-connection"/>)}
      {connections.filter((_, index) => index % 5 === 0).map((connection, index) => <path key={'signal-'+index} pathLength="1" d={connection.d} className="dashboard-network-signal" style={{animationDelay: `${-(connection.column * .65 + index * .31)}s`}}/>)}
      {nodes.map((node, index) => <g key={'node-'+index} className="dashboard-network-node" style={{animationDelay: `${-(node.column * .22 + node.row * .12)}s`}}>
        <circle className="dashboard-network-ring" cx={node.x} cy={node.y} r="15"/>
        <circle className="dashboard-network-shell" cx={node.x} cy={node.y} r="13"/>
        <circle className="dashboard-network-core" cx={node.x} cy={node.y} r="4"/>
      </g>)}
    </svg>
    <div className="dashboard-network-axis" aria-hidden="true"><span>INPUT</span><b>HIDDEN LAYERS</b><span>OUTPUT</span></div>
  </figure>;
}
