type WinterSceneProps = { progress?: number; className?: string };

function Pine({ x, y, scale = 1, color = "#476b71" }: { x: number; y: number; scale?: number; color?: string }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-4 0h8l3 22h-14z" fill="#846d62" />
    <path d="M0-105 31-57H16L39-22H16L30 0h-60l14-22h-23l23-35h-15z" fill={color} />
    <path d="M0-105 13-82 7-84 19-61 11-64 24-43 13-47 22-29H-5L6-48-7-44 5-64-5-61 6-84-1-82z" fill="#f8fbfa" opacity=".94" />
  </g>;
}

function Hiker({ x, y, jacket }: { x: number; y: number; jacket: string }) {
  return <g transform={`translate(${x} ${y})`}>
    <ellipse cx="0" cy="29" rx="17" ry="5" fill="#839ba3" opacity=".25" />
    <path d="M-11 9q11-8 22 0l5 20h-32z" fill={jacket} />
    <circle cy="-1" r="10" fill="#f0c5a1" />
    <path d="M-11-5q1-12 11-12t11 12z" fill="#324c67" />
    <path d="M-13-4h26v4h-26z" rx="2" fill="#d99375" />
    <path d="M-6 27v5m12-5v5" stroke="#35465a" strokeWidth="4" strokeLinecap="round" />
    <path d="M-14 13l-7 10m35-10 7 8" stroke={jacket} strokeWidth="5" strokeLinecap="round" />
    <circle cx="3" cy="-1" r="1" fill="#35465a" />
  </g>;
}

export function WinterScene({ progress = 0, className = "" }: WinterSceneProps) {
  const trailLights = [
    [92, 457], [184, 450], [278, 444], [372, 433], [468, 417],
    [558, 398], [641, 376], [718, 354], [790, 335], [860, 318],
  ];
  return <svg className={className} viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="An illustrated snowy trail winding through pine trees toward a warm, glowing mountain lodge">
    <defs>
      <linearGradient id="winter-sky" x2="0" y2="1"><stop stopColor="#c5d9ec"/><stop offset=".54" stopColor="#f3d9cd"/><stop offset="1" stopColor="#f6e9d9"/></linearGradient>
      <radialGradient id="winter-sun"><stop stopColor="#fff5d7" stopOpacity=".95"/><stop offset="1" stopColor="#f7d7b4" stopOpacity="0"/></radialGradient>
      <linearGradient id="winter-snow" x2="0" y2="1"><stop stopColor="#fffefa"/><stop offset="1" stopColor="#dceaf0"/></linearGradient>
      <linearGradient id="trail" x2="0" y2="1"><stop stopColor="#fffdf7"/><stop offset="1" stopColor="#f2eee5"/></linearGradient>
      <filter id="soft-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="9"/></filter>
    </defs>
    <path fill="url(#winter-sky)" d="M0 0h1200v500H0z" />
    <circle cx="865" cy="147" r="145" fill="url(#winter-sun)" />
    <circle cx="865" cy="147" r="40" fill="#fff0d3" opacity=".7" />
    <path d="m0 278 110-91 73 51 126-142 123 135 94-77 136 138 109-119 123 112 124-135 182 145v185H0z" fill="#c3d5e2" opacity=".78" />
    <path d="m0 310 134-99 105 91 99-114 122 104 102-77 125 102 125-117 122 107 120-85 146 100v178H0z" fill="#a9c1d0" opacity=".68" />
    <path d="M0 286q116-39 218 13t203-5q124-58 239 7t210-1q141-58 330 4v196H0z" fill="#e5edf0" />
    <path d="M0 329q131-58 259 2t235 2q124-56 241 1t238 10q113-43 227 3v153H0z" fill="#f7faf8" />

    <g opacity=".7" fill="#fffef8">
      <circle cx="95" cy="118" r="2"/><circle cx="184" cy="77" r="2.5"/><circle cx="308" cy="147" r="2"/>
      <circle cx="438" cy="95" r="2"/><circle cx="575" cy="139" r="2.4"/><circle cx="1033" cy="90" r="2"/>
      <circle cx="1102" cy="169" r="2.5"/><circle cx="726" cy="73" r="1.8"/><circle cx="971" cy="211" r="2"/>
    </g>

    <path d="M0 331q74-45 150-4 50-49 108-16 60-67 129 4 70-52 134 10 66-43 138 7 68-69 143-9 76-60 139-1 76-63 145 3 55-41 114-13v188H0z" fill="#c4d9df" />
    <path d="M0 370q103-61 195-8 87-49 167 1 101-45 194 13 77-38 162 11 92-54 173 10 85-39 171 11 70-43 138 0v142H0z" fill="url(#winter-snow)" />

    {/* Winding snow path leading into the lodge */}
    <path d="M0 488q155-37 274-45 127-9 204-24 108-22 159-63 57-45 100-65 61-29 154-23" fill="none" stroke="#d4e1e2" strokeWidth="60" strokeLinecap="round" />
    <path d="M0 484q155-37 274-45 127-9 204-24 108-22 159-63 57-45 100-65 61-29 154-23" fill="none" stroke="url(#trail)" strokeWidth="51" strokeLinecap="round" />
    <path d="M0 484q155-37 274-45 127-9 204-24 108-22 159-63 57-45 100-65 61-29 154-23" fill="none" stroke="#e8e0d4" strokeWidth="2" strokeDasharray="2 18" strokeLinecap="round" opacity=".8" />

    {/* Warm lodge */}
    <g transform="translate(888 200)">
      <ellipse cx="111" cy="126" rx="126" ry="20" fill="#91a9af" opacity=".22" />
      <path d="M25 48 111-8l87 56v78H25z" fill="#8c6658" />
      <path d="M10 51 111-18l103 69-11 10-92-59-91 59z" fill="#465b6b" />
      <path d="M8 48q48-13 104-13 55 0 105 14l-6 10q-47-8-100-8T16 60z" fill="#fdfcf6" />
      <path d="M78 74h29v52H78z" fill="#f6cf91" />
      <path d="M83 79h19v42H83z" fill="#ffd993" />
      <path d="M139 70h34v35h-34z" fill="#f6d08f" />
      <path d="M144 75h24v25h-24z" fill="#ffe0a2" />
      <path d="M145 88h22m-11-12v24" stroke="#a8785d" strokeWidth="3" />
      <path d="M102 126v-28q0-10 10-10t10 10v28z" fill="#574c4b" />
      <path d="M53 45v-23h20v36" fill="#73584e" />
      <path d="M49 24q13-11 28 0l-4 6q-10-5-20 0z" fill="#fffdf7" />
      <circle cx="107" cy="-3" r="20" fill="#ffce83" opacity=".3" filter="url(#soft-glow)" />
    </g>

    {/* Snow-laden pines frame the scene */}
    <Pine x={26} y={361} scale={1.42} color="#4f7075" />
    <Pine x={112} y={343} scale={1.03} color="#587c7a" />
    <Pine x={205} y={352} scale={.8} color="#6c8c89" />
    <Pine x={1110} y={345} scale={1.1} color="#557779" />
    <Pine x={1190} y={363} scale={1.45} color="#42686c" />
    <Pine x={1042} y={373} scale={.67} color="#789594" />
    <Pine x={322} y={384} scale={.48} color="#789594" />
    <Pine x={773} y={350} scale={.46} color="#75928f" />

    {/* Two little hikers on the trail */}
    <Hiker x={405} y={371} jacket="#9b7895" />
    <Hiker x={447} y={365} jacket="#547f85" />

    {/* Tiny lanterns brighten as today's habits are completed */}
    {trailLights.map(([x, y], index) => <g key={index}>
      {index < progress && <circle cx={x} cy={y} r="13" fill="#f7c878" opacity=".22" />}
      <circle cx={x} cy={y} r="5" fill={index < progress ? "#e8a64e" : "#fffdf7"} stroke={index < progress ? "#fff1c8" : "#cad8da"} strokeWidth="2" />
    </g>)}
  </svg>;
}
