import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function BiotechSimulations() {
  const [selectedClass, setSelectedClass] = useState(null);
  const [activeLab, setActiveLab] = useState(null);
  const [currentStep, setCurrentStep] = useState('theory');
  const [videoUrl, setVideoUrl] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(false);

  // Class-wise experiments
  const classExperiments = {
    'class-9': [
      { id: 'onion-peel', title: 'Onion Peel Cell Observation', type: 'microscopy' },
      { id: 'plant-cells', title: 'Plant Cell Structure Study', type: 'microscopy' }
    ],
    'class-10': [
      { id: 'stomata', title: 'Stomatal Observation', type: 'microscopy' },
      { id: 'food-test', title: 'Food Test Experiments', type: 'chemical' }
    ],
    'class-11': [
      { id: 'mitosis', title: 'Mitosis Cell Division', type: 'microscopy' },
      { id: 'dna-extract', title: 'DNA Extraction from Onion', type: 'molecular' }
    ],
    'class-12': [
      { id: 'pcr', title: 'PCR Simulation', type: 'molecular' },
      { id: 'gel-electro', title: 'Gel Electrophoresis', type: 'molecular' }
    ]
  };

  const classData = {
    'class-9': { title: 'Class 9', subtitle: 'Science', color: 'from-amber-400 to-amber-600', emoji: '🔬' },
    'class-10': { title: 'Class 10', subtitle: 'Science', color: 'from-cyan-400 to-cyan-600', emoji: '🧫' },
    'class-11': { title: 'Class 11', subtitle: 'Biology', color: 'from-violet-400 to-violet-600', emoji: '🧬' },
    'class-12': { title: 'Class 12', subtitle: 'Biology', color: 'from-emerald-400 to-emerald-600', emoji: '🧪' }
  };

  const labDetails = {
    'onion-peel': {
      name: 'Onion Peel Cell Observation',
      theory: 'The onion epidermal peel experiment is a fundamental microscopy technique used to study plant cell structure. Onion epidermal cells are ideal for observation because they are large, rectangular in shape, and arranged in a regular brick-like pattern. These cells lack chloroplasts, making the internal structures clearly visible. Key observations include cell wall, cytoplasm, nucleus, and large central vacuole. Iodine solution stains the nucleus brown-purple due to its affinity for chromatin.',
      procedure: [
        'Select a fresh, firm onion bulb and remove the dry outer layers',
        'Using forceps, carefully peel a thin, transparent epidermal layer from the inner fleshy scales',
        'Transfer the peel to a watch glass containing distilled water using forceps',
        'Cut the peel to 1cm² size and transfer to a clean glass slide using a brush',
        'Add 2-3 drops of iodine solution to stain the cells and wait 2-3 minutes',
        'Remove excess stain with a dropper, add glycerine drop, then gently lower coverslip at 45° angle',
        'Observe first under low power (10X), then switch to high power (40X) objective'
      ],
      guide: 'CRITICAL TIPS: Use only inner fleshy layers. Peel must be extremely thin. Lower coverslip slowly at 45° angle to prevent air bubbles. Use fresh iodine solution. Wipe slide edges clean before observation.',
      viva: [
        { q: 'What is the shape of onion epidermal cells?', a: 'Rectangular/brick-shaped' },
        { q: 'Why is iodine used as a stain?', a: 'Stains nucleus chromatin brown-purple' },
        { q: 'Name 4 cell organelles visible in this preparation', a: 'Cell wall, cytoplasm, nucleus, vacuole' },
        { q: 'Why onion peel and not leaf peel?', a: 'No chloroplasts, thin transparent epidermis' },
        { q: 'What would happen if coverslip had air bubbles?', a: 'Dark circular artifacts obscure view' }
      ]
    },
    'plant-cells': {
      name: 'Plant Cell Structure Study',
      theory: 'Plant cells exhibit distinct structural features that differentiate them from animal cells. This experiment uses peels from different plant parts to observe variations in cell structure. Epidermal peels reveal cell wall rigidity, while cheek cells serve as comparison. Key plant cell features: Cell wall provides shape/rigidity, large central vacuole 80-90% cell volume, plastids (chloroplasts in green tissues), plasmodesmata (cell-cell connections).',
      procedure: [
        'Prepare peels from onion (non-green), tradescantia leaf (green), and human cheek',
        'Follow same staining procedure as onion peel for all samples',
        'Mount each on separate slides with proper labeling',
        'Observe under microscope and draw labeled diagrams',
        'Compare plant vs animal cell features systematically'
      ],
      guide: 'COMPARISON TABLE: Feature | Plant Cell | Animal Cell — Cell Wall: Present vs Absent — Shape: Fixed vs Round/Irregular — Vacuole: Large central vs Small/multiple — Plastids: Present vs Absent.',
      viva: [
        { q: 'Name the non-living rigid layer outside cell membrane', a: 'Cell wall' },
        { q: 'What gives green color to leaf cells?', a: 'Chloroplasts' },
        { q: 'Which cell organelle occupies 90% of plant cell volume?', a: 'Central vacuole' },
        { q: 'Why animal cells lack cell wall?', a: 'Need flexibility for movement' },
        { q: 'What stains cytoplasm in plant cells?', a: 'Iodine solution' }
      ]
    },
    'stomata': {
      name: 'Stomatal Observation',
      theory: 'Stomata are specialized epidermal structures for gas exchange and transpiration control. Each stoma consists of two bean-shaped guard cells that regulate opening/closing via turgor pressure changes. Located primarily on leaf undersurface, stomatal density varies 100-1000 per mm². Guard cells contain chloroplasts and regulate CO₂ intake for photosynthesis while minimizing water loss.',
      procedure: [
        'Select healthy dicot leaf (hibiscus/tradescantia), peel lower epidermis',
        'Stain with safranin (red) or iodine solution',
        'Mount on slide, observe under high power (40X)',
        'Count stomata in 1mm² area for density calculation',
        'Draw labeled diagram showing guard cells and subsidiary cells'
      ],
      guide: 'IDENTIFICATION: Guard cells → Bean-shaped, chloroplast-rich. Stoma → Pore between guard cells.',
      viva: [
        { q: 'What controls stomatal opening/closing?', a: 'Turgor pressure in guard cells' },
        { q: 'Why stomata mostly on leaf underside?', a: 'Reduces water loss (less sunlight)' },
        { q: 'Name hormone that closes stomata during stress', a: 'Abscisic acid (ABA)' },
        { q: 'Function of chloroplasts in guard cells?', a: 'Produce sugars for osmotic opening' },
        { q: 'What is stomatal index?', a: 'Percentage of stomata to total epidermal cells' }
      ]
    },
    'food-test': {
      name: 'Food Test Experiments',
      theory: 'Biochemical tests identify major biomolecules using specific color reactions. Benedict\'s test detects reducing sugars (green/yellow/red precipitate). Biuret test detects proteins (violet color). Iodine test detects starch (blue-black complex). Sudan III detects lipids (red stain in oily layer).',
      procedure: [
        'Prepare food samples: potato, milk, sugar solution, egg white',
        'Test each for starch (iodine), reducing sugar (Benedict), protein (Biuret), lipid (Sudan III)',
        'Record color changes and positive/negative results',
        'Prepare control samples (pure glucose, albumin) for comparison'
      ],
      guide: 'COLOR CHART: Starch + Iodine = Blue-black | Reducing sugar + Benedict = Green→Yellow→Red ppt | Protein + Biuret = Violet | Lipid + Sudan III = Red oily layer.',
      viva: [
        { q: 'Which test gives blue-black color?', a: 'Starch + Iodine test' },
        { q: 'Benedict test detects what type of sugar?', a: 'Reducing sugars (glucose, fructose)' },
        { q: 'Biuret reagent contains what ions?', a: 'Cu²⁺ in alkaline medium' },
        { q: 'Why Sudan III is used for fats?', a: 'Fat-soluble red dye' },
        { q: 'What is negative control in food tests?', a: 'Sample known to lack that biomolecule' }
      ]
    },
    'mitosis': {
      name: 'Mitosis Cell Division',
      theory: 'Mitosis produces identical daughter cells for growth/repair. Onion root tip meristematic cells divide rapidly (every 12-24 hours), ideal for observing all stages. Carnoy\'s fixative preserves chromosome structure while acetocarmine staining enhances chromatin visibility.',
      procedure: [
        'Grow onion in water 4-5 days, collect 1-2cm root tips',
        'Fix in Carnoy\'s solution (3:1 ethanol:acetic acid) for 24hrs',
        'Hydrolyze in 1N HCl at 60°C for 5-10 mins',
        'Stain with 1% acetocarmine at 60°C for 20-30 mins',
        'Squash gently between slide and coverslip',
        'Observe stages under 40X objective, count 100 cells'
      ],
      guide: 'MITOTIC INDEX: MI = (Dividing cells / Total cells) × 100.',
      viva: [
        { q: 'Which onion tissue shows maximum mitosis?', a: 'Root tip meristem' },
        { q: 'Purpose of HCl hydrolysis?', a: 'Softens middle lamella' },
        { q: 'Acetocarmine stains what?', a: 'DNA/chromatin (red)' },
        { q: 'Which stage has chromosomes at equator?', a: 'Metaphase' },
        { q: 'What is mitotic index?', a: 'Percentage of dividing cells in population' }
      ]
    },
    'dna-extract': {
      name: 'DNA Extraction from Onion',
      theory: 'DNA extraction disrupts cell/tissue barriers to release nucleic acids. Onion cells lack lignified walls, making mechanical lysis easier. Detergent dissolves lipid membranes, salt neutralizes DNA phosphates for precipitation, cold ethanol dehydrates and precipitates DNA strands.',
      procedure: [
        'Chop 2g onion, blend with 20ml extraction buffer (detergent + salt)',
        'Filter through muslin cloth to remove debris',
        'Add equal volume ice-cold ethanol to filtrate',
        'DNA precipitates as white strands at interface',
        'Spool DNA using glass rod, transfer to microtube'
      ],
      guide: 'Use ice-cold ethanol for maximum DNA precipitation.',
      viva: [
        { q: 'Role of detergent in DNA extraction?', a: 'Dissolves cell/lipid membranes' },
        { q: 'Why use ice-cold ethanol?', a: 'Maximizes DNA precipitation' },
        { q: 'Function of salt/NaCl?', a: 'Neutralizes DNA negative charges' },
        { q: 'Why onion preferred?', a: 'Soft tissue, high DNA content' },
        { q: 'What does DNA look like after precipitation?', a: 'White cotton-like strands' }
      ]
    },
    'pcr': {
      name: 'PCR Simulation',
      theory: 'Polymerase Chain Reaction (PCR) amplifies specific DNA segments exponentially. Thermal cycling: Denaturation (95°C), Annealing (55°C), Extension (72°C). Taq polymerase (heat-stable) extends primers every cycle.',
      procedure: [
        'Prepare reaction mix: Template DNA, primers, dNTPs, Taq polymerase, buffer',
        'Load into thermal cycler with positive/negative controls',
        'Program: 95°C/5min → [95°C/30s, 55°C/30s, 72°C/1min] ×30 → 72°C/5min',
        'Analyze products via gel electrophoresis',
        'Visualize bands under UV transilluminator'
      ],
      guide: 'PCR success depends on optimal MgCl₂ concentration.',
      viva: [
        { q: 'What does PCR stand for?', a: 'Polymerase Chain Reaction' },
        { q: 'Why Taq polymerase used?', a: 'Thermostable — survives 95°C' },
        { q: 'Purpose of annealing step?', a: 'Primer binding to template' },
        { q: 'How many copies after 30 cycles?', a: '~1 billion (2³⁰)' },
        { q: 'What is denaturation temperature?', a: '95°C — separates DNA strands' }
      ]
    },
    'gel-electro': {
      name: 'Gel Electrophoresis',
      theory: 'Agarose gel electrophoresis separates DNA fragments by size through a porous matrix under an electric field. DNA (negative charge) migrates toward the anode. Smaller fragments move faster through gel pores.',
      procedure: [
        'Prepare 1% agarose gel in TAE buffer + EtBr',
        'Pour gel, set comb, solidify 30min',
        'Load: Ladder + samples + loading dye',
        'Run at 80V for 45-60min',
        'Visualize under UV transilluminator'
      ],
      guide: '1% agarose is best for 0.5-10kb fragments.',
      viva: [
        { q: 'Why DNA moves toward red electrode?', a: 'DNA negatively charged (PO₄ groups)' },
        { q: 'Smaller fragments move faster because?', a: 'Easier through agarose pores' },
        { q: 'Purpose of loading dye?', a: 'Density + tracking (bromophenol blue)' },
        { q: 'Why gel percentage affects resolution?', a: 'Pore size inversely proportional' },
        { q: 'What stains DNA in gel?', a: 'Ethidium bromide' }
      ]
    }
  };

  const typeIcons = { microscopy: '🔬', chemical: '⚗️', molecular: '🧬' };
  const typeLabels = { microscopy: 'Microscopy', chemical: 'Chemical Analysis', molecular: 'Molecular Biology' };

  // SUPABASE VIDEO PLAYER
  const LabSimulation = ({ labId }) => {
    useEffect(() => {
      setLoadingVideo(true);
      const { data } = supabase.storage
        .from('lab-videos')
        .getPublicUrl(`${labId}.mp4`);
      setVideoUrl(data.publicUrl);
      setLoadingVideo(false);
    }, [labId]);

    return (
      <div className="space-y-4">
        <div className="aspect-video bg-gradient-to-br from-[#060d18] via-[#0a1628] to-[#060d18] rounded-xl overflow-hidden shadow-xl relative border border-emerald-500/10">
          {loadingVideo ? (
            <div className="flex items-center justify-center h-full text-slate-300">
              <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mr-3"></div>
              Loading video…
            </div>
          ) : videoUrl ? (
            <video controls autoPlay className="w-full h-full">
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support video playback.
            </video>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-8">
              <div className="text-4xl mb-3 opacity-50">🎥</div>
              <p className="text-sm font-medium">Video not available</p>
              <p className="text-xs text-slate-600 mt-1">{labId}.mp4</p>
              <button onClick={() => window.location.reload()} className="mt-4 px-4 py-1.5 btn-teal rounded-lg text-xs">
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─────────────────────────── MAIN RENDER ───────────────────────────

  // View: Class Selection
  if (!selectedClass && !activeLab) {
    return (
      <div className="anim-fadeUp">
        {/* Section heading */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Select Your Class</h2>
          <p className="text-sm text-slate-500">Choose a class to view available experiments</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {Object.entries(classData).map(([classId, data]) => (
            <button
              key={classId}
              onClick={() => setSelectedClass(classId)}
              className="gem-card rounded-2xl p-6 text-left group anim-fadeUp"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 bg-gradient-to-br ${data.color} rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  {data.emoji}
                </div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-white/5 px-2 py-1 rounded-full">
                  {classExperiments[classId].length} Labs
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-1 group-hover:text-emerald-400 transition-colors">
                {data.title}
              </h3>
              <p className="text-sm text-slate-500">{data.subtitle}</p>
              <p className="text-emerald-400 text-xs font-semibold mt-3">Open →</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // View: Experiments List for Selected Class
  if (selectedClass && !activeLab) {
    const cls = classData[selectedClass];
    return (
      <div className="anim-fadeUp">
        <button
          onClick={() => setSelectedClass(null)}
          className="text-sm text-slate-500 hover:text-emerald-400 transition flex items-center gap-1 mb-8"
        >
          ← Back to Class Selection
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className={`w-12 h-12 bg-gradient-to-br ${cls.color} rounded-xl flex items-center justify-center text-xl shadow-lg`}>
            {cls.emoji}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">{cls.title} — {cls.subtitle}</h2>
            <p className="text-sm text-slate-500">{classExperiments[selectedClass].length} experiments available</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {classExperiments[selectedClass].map((lab) => (
            <button
              key={lab.id}
              onClick={() => setActiveLab(lab.id)}
              className="gem-card rounded-2xl p-6 text-left group anim-fadeUp"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 bg-gradient-to-br ${cls.color} rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  {typeIcons[lab.type] || '🔬'}
                </div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-white/5 px-2 py-1 rounded-full">
                  {typeLabels[lab.type] || lab.type}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-1 group-hover:text-emerald-400 transition-colors">
                {lab.title}
              </h3>
              <p className="text-emerald-400 text-xs font-semibold mt-2">Start Experiment →</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // View: Active Lab Detail
  if (activeLab) {
    const lab = labDetails[activeLab];
    const tabs = [
      { key: 'theory', label: 'Theory', icon: '📖' },
      { key: 'procedure', label: 'Procedure', icon: '🧪' },
      { key: 'guide', label: 'Guide', icon: '💡' },
      { key: 'viva', label: 'Viva', icon: '❓' },
      { key: 'simulation', label: 'Simulation', icon: '🎥' },
    ];

    return (
      <div className="anim-fadeUp">
        <button
          onClick={() => { setActiveLab(null); setCurrentStep('theory'); }}
          className="text-sm text-slate-500 hover:text-emerald-400 transition flex items-center gap-1 mb-6"
        >
          ← Back to Experiments
        </button>

        {/* Lab title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-100">{lab?.name}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {classData[selectedClass]?.title} · {classData[selectedClass]?.subtitle}
          </p>
        </div>

        {/* Tab bar */}
        <div className="feature-panel rounded-2xl overflow-hidden">
          <div className="flex border-b border-emerald-500/10 p-1.5 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCurrentStep(tab.key)}
                className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${currentStep === tab.key
                    ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/5'
                  }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6 md:p-8">
            {/* Theory */}
            {currentStep === 'theory' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  📖 Theory & Background
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">{lab?.theory}</p>
              </div>
            )}

            {/* Procedure */}
            {currentStep === 'procedure' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  🧪 Step-by-Step Procedure
                </h3>
                <div className="space-y-3">
                  {lab?.procedure?.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border-l-3 border-emerald-500/40">
                      <div className="flex-shrink-0 w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-500/20">
                        {i + 1}
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed pt-0.5">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Guide */}
            {currentStep === 'guide' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  💡 Practical Guide & Tips
                </h3>
                <div className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/15">
                  <p className="text-sm text-slate-300 leading-relaxed">{lab?.guide}</p>
                </div>
              </div>
            )}

            {/* Viva */}
            {currentStep === 'viva' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  ❓ Viva Questions
                </h3>
                <div className="space-y-3">
                  {lab?.viva?.map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-emerald-500/8 hover:border-emerald-500/20 transition">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-md">
                          Q{i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-200 text-sm">{item.q}</p>
                          <div className="mt-2 text-emerald-400 text-sm font-medium bg-emerald-500/10 border border-emerald-500/15 px-3 py-1.5 rounded-lg inline-block">
                            {item.a}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Simulation */}
            {currentStep === 'simulation' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  🎥 Lab Simulation
                </h3>
                <LabSimulation labId={activeLab} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
