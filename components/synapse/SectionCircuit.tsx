/** Decorative computing diagrams. Motion is gated by the containing section. */
export type CircuitKind = 'neural' | 'logic' | 'pipeline' | 'chip' | 'code' | 'writing' | 'network'

function Wire({ d, delay = 0 }: { d: string; delay?: number }) {
    return <>
        <path d={d} className="circuit-wire" />
        <path d={d} pathLength={100} className="section-motion circuit-packet" style={{ animationDelay: `${delay}s` }} />
    </>
}

export default function SectionCircuit({ kind }: { kind: CircuitKind }) {
    return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 280 132" className={`section-circuit section-circuit-${kind}`}>
            {kind === 'neural' && <>
                {[28, 66, 104].flatMap((y, i) => [38, 94].map((end, j) => <Wire key={`${i}-${j}`} d={`M32 ${y} C80 ${y} 76 ${end} 116 ${end}`} delay={i * -1.1 - j} />))}
                {[38, 94].flatMap((y, i) => [28, 66, 104].map((end, j) => <Wire key={`${i}-${j}`} d={`M116 ${y} C168 ${y} 170 ${end} 214 ${end}`} delay={i - j * 1.3} />))}
                {[[32,28],[32,66],[32,104],[116,38],[116,94],[214,28],[214,66],[214,104]].map(([x,y], i) => <g key={i}>
                    <circle cx={x} cy={y} r={9} className="circuit-node" />
                    <circle cx={x} cy={y} r={3} className="section-motion circuit-core" style={{ animationDelay: `${i * -.6}s` }} />
                </g>)}
            </>}
            {kind === 'logic' && <>
                <Wire d="M12 28 H58 V40 H94 M12 62 H70 V52 H94" />
                <Wire d="M12 98 H94 M144 46 H177 V66 H204 M144 98 H177 V78 H204" delay={-1.6} />
                <path d="M94 28 H118 A18 18 0 0 1 118 64 H94 Z M94 80 L132 98 L94 116 Z M204 54 H223 A18 18 0 0 1 223 90 H204 Z" className="circuit-node" />
                <circle cx={138} cy={98} r={5} className="circuit-node" />
                <Wire d="M241 72 H270" delay={-2.4} />
                {[28,62,98].map(y => <circle key={y} cx={12} cy={y} r={3} className="circuit-core" />)}
            </>}
            {kind === 'pipeline' && <>
                <Wire d="M10 66 H270" />
                <Wire d="M56 44 V20 H140 V44 M140 88 V112 H224 V88" delay={-2} />
                {[56,140,224].map((x,i) => <g key={x}>
                    <rect x={x-22} y={44} width={44} height={44} rx={6} className="circuit-node" />
                    <path d={`M${x-8} 66 l6 6 11-13`} className="section-motion circuit-check" style={{ animationDelay: `${i * -1.2}s` }} />
                    <circle cx={x} cy={i === 1 ? 112 : 20} r={3} className="circuit-core" />
                </g>)}
            </>}
            {kind === 'chip' && <>
                {[0,1,2,3].map(i => <g key={i}>
                    <Wire d={`M${14+i*7} ${20+i*28} H${62+i*9} V${42+i*16} H108`} delay={i * -.8} />
                    <Wire d={`M172 ${42+i*16} H${204-i*9} V${20+i*28} H${266-i*7}`} delay={i * -.8-1.5} />
                </g>)}
                <rect x={108} y={26} width={64} height={80} rx={7} className="circuit-node" />
                <rect x={122} y={42} width={36} height={48} rx={3} className="circuit-wire" />
                {[0,1,2].map(i => <path key={i} d={`M130 ${54+i*12} h20`} className="section-motion circuit-check" style={{ animationDelay: `${i * -.9}s` }} />)}
            </>}
            {kind === 'code' && <>
                <rect x={44} y={12} width={192} height={98} rx={7} className="circuit-node" />
                <path d="M44 32 H236 M120 110 V122 H160 V110 M100 122 H180" className="circuit-wire" />
                {[56,66,76].map(x => <circle key={x} cx={x} cy={22} r={2} className="circuit-core" />)}
                <path d="M105 52 L85 68 L105 84 M175 52 L195 68 L175 84 M149 48 L131 88" className="section-motion circuit-code" />
                <Wire d="M8 50 H28 V82 H44 M236 50 H252 V82 H272" delay={-2} />
            </>}
            {kind === 'writing' && <>
                <path d="M28 16 H132 V116 H28 Z M44 36 H104 M44 52 H116 M44 68 H96 M44 84 H110 M44 100 H80" className="circuit-wire" />
                <path d="M44 36 H104 M44 52 H116 M44 68 H96 M44 84 H110 M44 100 H80" pathLength={100} className="section-motion circuit-encode" />
                <Wire d="M132 42 H164 V28 H202 M132 66 H202 M132 90 H164 V104 H202" delay={-1} />
                {[28,66,104].map((y,i) => <g key={y}>
                    <rect x={202} y={y-7} width={12} height={14} rx={2} className="section-motion circuit-core" style={{ animationDelay: `${i * -.7}s` }} />
                    <path d={`M226 ${y-5} v10 m10-10 v10 m10-10 v10`} className="circuit-wire" />
                </g>)}
            </>}
            {kind === 'network' && <>
                <rect x={10} y={42} width={58} height={44} rx={5} className="circuit-node" />
                <path d="M10 48 L39 68 L68 48 M20 98 H58 M39 86 V98" className="circuit-wire" />
                <Wire d="M68 54 H108 V34 H172 V54 H212" />
                <Wire d="M212 78 H172 V98 H108 V78 H68" delay={-2.2} />
                <rect x={212} y={42} width={58} height={44} rx={5} className="circuit-node" />
                <path d="M212 48 L241 68 L270 48" className="circuit-wire" />
                <path d="M134 28 L142 34 L134 40 M146 92 L138 98 L146 104" className="circuit-code" />
            </>}
        </svg>
    )
}
