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
    'class-9': { title: 'Class 9 - Science', color: 'from-amber-400 to-amber-600' },
    'class-10': { title: 'Class 10 - Science', color: 'from-cyan-400 to-cyan-600' },
    'class-11': { title: 'Class 11 - Biology', color: 'from-violet-400 to-violet-600' },
    'class-12': { title: 'Class 12 - Biology', color: 'from-emerald-400 to-emerald-600' }
  };

  const labDetails = {
    'onion-peel': {
      name: 'Onion Peel Cell Observation',
      theory: 'The onion epidermal peel experiment is a fundamental microscopy technique used to study plant cell structure. Onion epidermal cells are ideal for observation because they are large, rectangular in shape, and arranged in a regular brick-like pattern. These cells lack chloroplasts, making the internal structures clearly visible. Key observations include cell wall, cytoplasm, nucleus, and large central vacuole. Iodine solution stains the nucleus brown-purple due to its affinity for chromatin.',
      procedure: [
        'Select a fresh, firm onion bulb and remove the dry outer layers',
        'Using forceps, carefully peel a thin, transparent epidermal layer from the inner fleshy scales',
        'Transfer the peel to a watch glass containing distilled water using forceps',
        'Cut the peel to 1cm2 size and transfer to a clean glass slide using a brush',
        'Add 2-3 drops of iodine solution to stain the cells and wait 2-3 minutes',
        'Remove excess stain with a dropper, add glycerine drop, then gently lower coverslip at 45 degree angle',
        'Observe first under low power 10X, then switch to high power 40X objective'
      ],
      guide: 'CRITICAL TIPS: Use only inner fleshy layers. Peel must be extremely thin. Lower coverslip slowly at 45 degree angle to prevent air bubbles. Use fresh iodine solution. Wipe slide edges clean before observation.',
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
      theory: 'Plant cells exhibit distinct structural features that differentiate them from animal cells. This experiment uses peels from different plant parts to observe variations in cell structure. Epidermal peels reveal cell wall rigidity, while cheek cells serve as comparison. Key plant cell features: Cell wall provides shape/rigidity, large central vacuole 80-90 percent cell volume, plastids chloroplasts in green tissues, plasmodesmata cell-cell connections.',
      procedure: [
        'Prepare peels from onion non-green, tradescantia leaf green, and human cheek',
        'Follow same staining procedure as onion peel for all samples',
        'Mount each on separate slides with proper labeling',
        'Observe under microscope and draw labeled diagrams',
        'Compare plant vs animal cell features systematically'
      ],
      guide: 'COMPARISON TABLE: Feature Plant Cell Animal Cell - Cell Wall Present Absent - Shape Fixed Round/Irregular - Vacuole Large central Small/multiple - Plastids Present Absent.',
      viva: [
        { q: 'Name the non-living rigid layer outside cell membrane', a: 'Cell wall' },
        { q: 'What gives green color to leaf cells?', a: 'Chloroplasts' },
        { q: 'Which cell organelle occupies 90 percent of plant cell volume?', a: 'Central vacuole' },
        { q: 'Why animal cells lack cell wall?', a: 'Need flexibility for movement' },
        { q: 'What stains cytoplasm in plant cells?', a: 'Iodine solution' }
      ]
    },
    'stomata': {
      name: 'Stomatal Observation',
      theory: 'Stomata are specialized epidermal structures for gas exchange and transpiration control. Each stoma consists of two bean-shaped guard cells that regulate opening/closing via turgor pressure changes. Located primarily on leaf undersurface, stomatal density varies 100-1000 per mm2. Guard cells contain chloroplasts and regulate CO2 intake for photosynthesis while minimizing water loss.',
      procedure: [
        'Select healthy dicot leaf hibiscus/tradescantia, peel lower epidermis',
        'Stain with safranin red or iodine solution',
        'Mount on slide, observe under high power 40X',
        'Count stomata in 1mm2 area for density calculation',
        'Draw labeled diagram showing guard cells and subsidiary cells'
      ],
      guide: 'IDENTIFICATION: Guard cells Bean-shaped chloroplast-rich, Stoma Pore between guard cells.',
      viva: [
        { q: 'What controls stomatal opening/closing?', a: 'Turgor pressure in guard cells' },
        { q: 'Why stomata mostly on leaf underside?', a: 'Reduces water loss less sunlight' },
        { q: 'Name hormone that closes stomata during stress', a: 'Abscisic acid ABA' },
        { q: 'Function of chloroplasts in guard cells?', a: 'Produce sugars osmotic influx opening' },
        { q: 'What is stomatal index?', a: 'Percentage of stomata to total epidermal cells' }
      ]
    },
    'food-test': {
      name: 'Food Test Experiments',
      theory: 'Biochemical tests identify major biomolecules using specific color reactions. Benedict\'s test detects reducing sugars green/yellow/red precipitate. Biuret test detects proteins violet color. Iodine test detects starch blue-black complex. Sudan III detects lipids red stain in oily layer.',
      procedure: [
        'Prepare food samples potato, milk, sugar solution, egg white',
        'Test each for starch iodine, reducing sugar Benedict, protein Biuret, lipid Sudan III',
        'Record color changes and positive/negative results',
        'Prepare control samples pure glucose, albumin for comparison'
      ],
      guide: 'COLOR CHART: Starch + Iodine = Blue-black, Reducing sugar + Benedict = Green-Yellow-Red ppt, Protein + Biuret = Violet, Lipid + Sudan III = Red oily layer.',
      viva: [
        { q: 'Which test gives blue-black color?', a: 'Starch + Iodine test' },
        { q: 'Benedict test detects what type of sugar?', a: 'Reducing sugars glucose, fructose' },
        { q: 'Biuret reagent contains what ions?', a: 'Cu2+ in alkaline medium' },
        { q: 'Why Sudan III is used for fats?', a: 'Fat soluble red dye' },
        { q: 'What is negative control in food tests?', a: 'Sample known to lack that biomolecule' }
      ]
    },
    'mitosis': {
      name: 'Mitosis Cell Division',
      theory: 'Mitosis produces identical daughter cells for growth/repair. Onion root tip meristematic cells divide rapidly every 12-24 hours, ideal for observing all stages. Carnoy\'s fixative preserves chromosome structure while acetocarmine staining enhances chromatin visibility.',
      procedure: [
        'Grow onion in water 4-5 days, collect 1-2cm root tips',
        'Fix in Carnoy\'s solution 3:1 ethanol:acetic acid for 24hrs',
        'Hydrolyze in 1N HCl at 60C for 5-10 mins',
        'Stain with 1 percent acetocarmine at 60C for 20-30 mins',
        'Squash gently between slide and coverslip',
        'Observe stages under 40X objective, count 100 cells'
      ],
      guide: 'MITOTIC INDEX: MI = Dividing cells / Total cells x 100.',
      viva: [
        { q: 'Which onion tissue shows maximum mitosis?', a: 'Root tip meristem' },
        { q: 'Purpose of HCl hydrolysis?', a: 'Softens middle lamella' },
        { q: 'Acetocarmine stains what?', a: 'DNA/chromatin red' },
        { q: 'Which stage has chromosomes at equator?', a: 'Metaphase' },
        { q: 'What is mitotic index?', a: 'Percentage of dividing cells in population' }
      ]
    },
    'dna-extract': {
      name: 'DNA Extraction from Onion',
      theory: 'DNA extraction disrupts cell/tissue barriers to release nucleic acids. Onion cells lack lignified walls, making mechanical lysis easier. Detergent dissolves lipid membranes, salt neutralizes DNA phosphates precipitation, cold ethanol dehydrates and precipitates DNA strands.',
      procedure: [
        'Chop 2g onion, blend with 20ml extraction buffer detergent + salt',
        'Filter through muslin cloth remove debris',
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
      theory: 'Polymerase Chain Reaction PCR amplifies specific DNA segments exponentially. Thermal cycling: Denaturation 95C, Annealing 55C, Extension 72C. Taq polymerase heat-stable extends primers every cycle.',
      procedure: [
        'Prepare reaction mix: Template DNA, primers, dNTPs, Taq polymerase, buffer',
        'Load into thermal cycler with positive/negative controls',
        'Program: 95C/5min - 95C/30s, 55C/30s, 72C/1min x30 - 72C/5min',
        'Analyze products via gel electrophoresis',
        'Visualize bands under UV transilluminator'
      ],
      guide: 'PCR success depends on optimal MgCl2 concentration.',
      viva: [
        { q: 'What does PCR stand for?', a: 'Polymerase Chain Reaction' },
        { q: 'Why Taq polymerase used?', a: 'Thermostable survives 95C' },
        { q: 'Purpose of annealing step?', a: 'Primer binding to template' },
        { q: 'How many copies after 30 cycles?', a: '~1 billion 2^30' },
        { q: 'What is denaturation temperature?', a: '95C - separates DNA strands' }
      ]
    },
    'gel-electro': {
      name: 'Gel Electrophoresis',
      theory: 'Agarose gel electrophoresis separates DNA fragments by size through porous matrix under electric field. DNA negative charge migrates toward anode. Smaller fragments move faster through gel pores.',
      procedure: [
        'Prepare 1 percent agarose gel in TAE buffer + EtBr',
        'Pour gel, set comb, solidify 30min',
        'Load: Ladder + samples + loading dye',
        'Run at 80V for 45-60min',
        'Visualize under UV transilluminator'
      ],
      guide: '1 percent agarose best for 0.5-10kb fragments.',
      viva: [
        { q: 'Why DNA moves toward red electrode?', a: 'DNA negatively charged PO4 groups' },
        { q: 'Smaller fragments move faster because?', a: 'Easier through agarose pores' },
        { q: 'Purpose of loading dye?', a: 'Density + tracking dye bromophenol blue' },
        { q: 'Why gel percentage affects resolution?', a: 'Pore size inversely proportional' },
        { q: 'What stains DNA in gel?', a: 'Ethidium bromide' }
      ]
    }
  };

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

    const reloadVideo = () => window.location.reload();

    return (
      <div className="space-y-6">
        <div className="aspect-video bg-gradient-to-br from-[#060d18] via-[#0a1628] to-[#060d18] rounded-2xl overflow-hidden shadow-2xl relative border border-emerald-500/10">
          {loadingVideo ? (
            <div className="flex items-center justify-center h-full text-slate-300">
              <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mr-4"></div>
              Loading {labId}.mp4...
            </div>
          ) : videoUrl ? (
            <video controls autoPlay className="w-full h-full">
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support video playback.
            </video>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 text-center p-8">
              <div className="text-2xl mb-4">Video Not Found</div>
              <div className="text-slate-500 mb-6">{labId}.mp4</div>
              <button onClick={reloadVideo} className="px-6 py-2 btn-teal rounded-lg">
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // MAIN UI
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold shimmer-text mb-6">
            🧪 NCERT Virtual Labs
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Biotechnology Experiments - Class 9 to 12
          </p>
        </div>

        {/* CLASS SELECTION */}
        {!selectedClass && !activeLab && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {Object.entries(classData).map(([classId, data]) => (
              <div
                key={classId}
                className="card-dark p-10 cursor-pointer group hover:-translate-y-2 transition-all duration-300"
                onClick={() => setSelectedClass(classId)}
              >
                <div className={`w-24 h-24 bg-gradient-to-br ${data.color} rounded-3xl mx-auto mb-8 flex items-center justify-center group-hover:scale-110 transition-all shadow-2xl`}>
                  <span className="text-3xl font-black text-white drop-shadow-lg">{classId.replace('class-', '')}</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-100 text-center mb-4 group-hover:text-emerald-400 transition-colors">
                  {data.title}
                </h3>
                <div className="text-emerald-400 font-bold text-lg text-center">
                  {classExperiments[classId].length} Experiments
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CLASS EXPERIMENTS */}
        {selectedClass && !activeLab && (
          <div>
            <button
              onClick={() => setSelectedClass(null)}
              className="mb-12 px-8 py-3 card-dark text-emerald-400 flex items-center gap-3 mx-auto text-lg font-semibold hover:border-emerald-500/30 transition"
            >
              ← Back to Class Selection
            </button>

            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-100 mb-4">
                {classData[selectedClass].title}
              </h2>
              <div className="text-2xl text-emerald-400 font-bold">
                {classExperiments[selectedClass].length} Experiments
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {classExperiments[selectedClass].map((lab) => (
                <div
                  key={lab.id}
                  className="card-dark p-10 cursor-pointer group hover:-translate-y-3 transition-all duration-300"
                  onClick={() => setActiveLab(lab.id)}
                >
                  <div className={`w-28 h-28 bg-gradient-to-br ${classData[selectedClass].color} rounded-3xl mx-auto mb-8 flex items-center justify-center group-hover:scale-110 transition-all shadow-2xl text-4xl`}>
                    🔬
                  </div>
                  <h3 className="text-2xl font-bold text-slate-100 text-center mb-6 group-hover:text-emerald-400 transition-colors line-clamp-2 px-4">
                    {lab.title}
                  </h3>
                  <div className="text-emerald-400 font-bold text-xl text-center uppercase tracking-wide">
                    {lab.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTIVE LAB CONTENT */}
        {activeLab && (
          <div>
            <button
              onClick={() => setActiveLab(null)}
              className="mb-12 px-8 py-3 card-dark text-emerald-400 flex items-center gap-3 mx-auto text-lg font-semibold hover:border-emerald-500/30 transition"
            >
              ← Back to Experiments
            </button>

            <div className="card-dark overflow-hidden">
              {/* TABS */}
              <div className="p-1 border-b border-emerald-500/10">
                <div className="flex">
                  {['theory', 'procedure', 'guide', 'viva', 'simulation'].map((step) => (
                    <button
                      key={step}
                      onClick={() => setCurrentStep(step)}
                      className={`flex-1 py-4 px-6 font-semibold transition-all rounded-xl ${currentStep === step
                          ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/20'
                          : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/5'
                        }`}
                    >
                      {step === 'theory' && '📖 Theory'}
                      {step === 'procedure' && '🧪 Procedure'}
                      {step === 'guide' && '💡 Guide'}
                      {step === 'viva' && '❓ Viva'}
                      {step === 'simulation' && '🎥 Simulation'}
                    </button>
                  ))}
                </div>
              </div>

              {/* TAB CONTENT */}
              <div className="p-12">
                {currentStep === 'theory' && (
                  <div className="prose-dark max-w-none">
                    <h2 className="text-3xl font-bold text-slate-100 mb-6">{labDetails[activeLab]?.name}</h2>
                    <p className="text-lg text-slate-300 leading-relaxed whitespace-pre-wrap">{labDetails[activeLab]?.theory}</p>
                  </div>
                )}

                {currentStep === 'procedure' && (
                  <div>
                    <h2 className="text-3xl font-bold text-slate-100 mb-8">{labDetails[activeLab]?.name} - Procedure</h2>
                    <div className="space-y-4">
                      {labDetails[activeLab]?.procedure?.map((step, index) => (
                        <div key={index} className="flex items-start gap-4 p-6 bg-emerald-500/8 rounded-2xl border-l-4 border-emerald-500/40">
                          <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5 shadow-lg shadow-emerald-500/20">
                            {index + 1}
                          </div>
                          <p className="text-slate-300 leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep === 'guide' && (
                  <div>
                    <h2 className="text-3xl font-bold text-slate-100 mb-8">{labDetails[activeLab]?.name} - Practical Guide</h2>
                    <div className="prose-dark max-w-none">
                      <p className="text-lg text-slate-300 leading-relaxed whitespace-pre-wrap">{labDetails[activeLab]?.guide}</p>
                    </div>
                  </div>
                )}

                {currentStep === 'viva' && (
                  <div>
                    <h2 className="text-3xl font-bold text-slate-100 mb-8">{labDetails[activeLab]?.name} - Viva Questions</h2>
                    <div className="space-y-4">
                      {labDetails[activeLab]?.viva?.map((item, index) => (
                        <div key={index} className="card-dark p-6">
                          <div className="flex items-start gap-4 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-lg">
                              Q{index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-100 text-lg">{item.q}</p>
                              <p className="text-emerald-400 font-semibold mt-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-lg inline-block">
                                {item.a}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep === 'simulation' && (
                  <LabSimulation labId={activeLab} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
