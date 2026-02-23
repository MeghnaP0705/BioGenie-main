-- ============================================================================
-- BioGenie – Previous Year Question Papers Schema (Supabase)
-- Run this in Supabase SQL Editor to set up the PYQ feature.
-- ============================================================================

-- 1. Create the PYQ papers table
create table if not exists pyq_papers (
  id            bigserial primary key,
  class_level   text        not null check (class_level in ('9', '10', '11', '12')),
  year          text        not null,                         -- e.g. '2023', '2022'
  board         text        not null default 'CBSE',         -- e.g. 'CBSE', 'State Board'
  subject       text        not null default 'Biotechnology',
  paper_type    text        not null check (paper_type in ('question_paper', 'answer_key')),
  title         text        not null,                         -- e.g. 'Class 9 Biotechnology 2023'
  file_url      text,                                         -- Supabase Storage public URL
  content       text,                                         -- OR inline text/markdown content
  created_at    timestamptz default now()
);

-- 2. Enable Row Level Security
alter table pyq_papers enable row level security;

-- 3. Allow public read (students can read without auth)
create policy "Allow public read for pyq_papers"
  on pyq_papers for select
  using (true);

-- 4. Only service_role can insert/update/delete (admin only)
-- (service_role bypasses RLS by default)


-- ============================================================================
-- SAMPLE DATA – Replace file_url with your actual Supabase Storage URLs
-- Or fill in the `content` column with the markdown text of the paper
-- ============================================================================

insert into pyq_papers (class_level, year, board, paper_type, title, content) values
-- CLASS 9
('9', '2023', 'CBSE', 'question_paper', 'Class 9 Biotechnology – 2023',
 '## Class 9 Biotechnology Question Paper (2023)

**Time: 3 Hours | Max Marks: 70**

### Section A – Multiple Choice Questions (1 mark each)
1. Which of the following is a tool of genetic engineering?
   a) Ligase  b) Helicase  c) Primase  d) None

2. DNA is made up of:
   a) Amino acids  b) Nucleotides  c) Fatty acids  d) Monosaccharides

### Section B – Short Answer Questions (2 marks each)
3. Define biotechnology.
4. What is recombinant DNA technology?

### Section C – Long Answer Questions (5 marks each)
5. Explain the steps involved in gene cloning.
6. Describe the applications of biotechnology in agriculture.'),

('9', '2023', 'CBSE', 'answer_key', 'Class 9 Biotechnology – 2023 Answer Key',
 '## Class 9 Biotechnology Answer Key (2023)

### Section A
1. **(a) Ligase** – Restriction enzymes cut DNA; ligase joins the pieces.
2. **(b) Nucleotides** – DNA is a polynucleotide chain.

### Section B
3. **Biotechnology** – The use of living organisms or their components to develop products and processes for human benefit.
4. **Recombinant DNA technology** – A set of techniques to isolate, join, and reproduce DNA molecules from different organisms.

### Section C
5. **Gene Cloning Steps:**
   - Isolation of the desired gene
   - Insertion into a cloning vector (plasmid)
   - Introduction into a host cell
   - Selection of transformed cells
   - Multiplication and expression

6. **Biotech in Agriculture:**
   - Bt crops (pest resistance)
   - Herbicide-tolerant crops
   - Golden Rice (Vitamin A enrichment)
   - Disease-resistant varieties'),

-- CLASS 10
('10', '2023', 'CBSE', 'question_paper', 'Class 10 Biotechnology – 2023',
 '## Class 10 Biotechnology Question Paper (2023)

**Time: 3 Hours | Max Marks: 70**

### Section A – MCQ (1 mark each)
1. PCR stands for:
   a) Polymerase Catalytic Reaction  b) Polymerase Chain Reaction  c) Protein Chain Reaction  d) None

2. Restriction enzymes are also called:
   a) Molecular scissors  b) Molecular glue  c) Molecular motors  d) Molecular pumps

### Section B – Short Answer (2 marks each)
3. What is a plasmid? Why is it used as a vector?
4. Differentiate between transformation and transduction.

### Section C – Long Answer (5 marks each)
5. Describe the process of PCR with a diagram (label the steps only).
6. What are transgenic animals? Give two examples.'),

('10', '2023', 'CBSE', 'answer_key', 'Class 10 Biotechnology – 2023 Answer Key',
 '## Class 10 Biotechnology Answer Key (2023)

### Section A
1. **(b) Polymerase Chain Reaction**
2. **(a) Molecular scissors**

### Section B
3. **Plasmid** – A small, circular, self-replicating DNA molecule found outside the chromosome. Used as a vector because it can carry foreign DNA into a host cell and replicate independently.
4. **Transformation** – uptake of naked DNA from the environment. **Transduction** – transfer of DNA via bacteriophage.

### Section C
5. **PCR Steps:** Denaturation (94°C) → Annealing (50-60°C) → Extension (72°C). Repeated 30-40 cycles to amplify the target DNA.
6. **Transgenic Animals** – animals whose genome has been artificially modified. Examples: Dolly the sheep (cloned), Rosie the cow (produces human protein in milk).'),

-- CLASS 11
('11', '2023', 'CBSE', 'question_paper', 'Class 11 Biotechnology – 2023',
 '## Class 11 Biotechnology Question Paper (2023)

**Time: 3 Hours | Max Marks: 70**

### Section A – MCQ (1 mark each)
1. The enzyme used to synthesize DNA from RNA is:
   a) DNA polymerase  b) Reverse transcriptase  c) RNA polymerase  d) Ligase

2. Southern blotting is used to detect:
   a) Proteins  b) RNA  c) DNA  d) Lipids

### Section B – Short Answer (2 marks each)
3. What is ELISA? Give its principle.
4. Define bioreactor and state its purpose.

### Section C – Long Answer (5 marks each)
5. Explain Human Genome Project (HGP) and its salient features.
6. Describe the Ti plasmid and its role in plant transformation.'),

('11', '2023', 'CBSE', 'answer_key', 'Class 11 Biotechnology – 2023 Answer Key',
 '## Class 11 Biotechnology Answer Key (2023)

### Section A
1. **(b) Reverse transcriptase** – converts RNA to cDNA.
2. **(c) DNA** – Southern blotting is a DNA detection technique.

### Section B
3. **ELISA** – Enzyme-Linked Immunosorbent Assay. Principle: antigen-antibody interaction with enzyme-labeled antibody for colorimetric detection.
4. **Bioreactor** – A vessel where biological reactions occur under controlled conditions for large-scale production of biological products.

### Section C
5. **HGP Salient Features:** ~3 billion base pairs sequenced; ~20,000-25,000 genes identified; 99.9% of DNA is common between humans; completed in 2003. Aims: understand genetic diseases, drug development.
6. **Ti plasmid** – Tumor-inducing plasmid from *Agrobacterium tumefaciens*. Foreign genes are inserted into T-DNA, which integrates into plant genome, delivering the gene of interest.'),

-- CLASS 12
('12', '2023', 'CBSE', 'question_paper', 'Class 12 Biotechnology – 2023',
 '## Class 12 Biotechnology Question Paper (2023)

**Time: 3 Hours | Max Marks: 70**

### Section A – MCQ (1 mark each)
1. CRISPR-Cas9 is a tool for:
   a) Protein synthesis  b) Gene editing  c) Cell division  d) Fermentation

2. Monoclonal antibodies are produced by:
   a) B-lymphocytes  b) Hybridoma cells  c) T-lymphocytes  d) Plasma cells only

### Section B – Short Answer (2 marks each)
3. What is gene therapy? Give one example.
4. Distinguish between somatic and germline gene therapy.

### Section C – Long Answer (5 marks each)
5. Describe the steps in producing a recombinant vaccine. Use Hepatitis B vaccine as an example.
6. Explain the ethical issues surrounding genetically modified organisms (GMOs).'),

('12', '2023', 'CBSE', 'answer_key', 'Class 12 Biotechnology – 2023 Answer Key',
 '## Class 12 Biotechnology Answer Key (2023)

### Section A
1. **(b) Gene editing** – CRISPR-Cas9 makes precise cuts in DNA to add, remove, or alter sequences.
2. **(b) Hybridoma cells** – Fusion of B-lymphocyte with myeloma cell.

### Section B
3. **Gene therapy** – Introducing a normal gene into cells to correct a genetic defect. Example: ADA deficiency (Adenosine deaminase SCID).
4. **Somatic** – Affects body cells; not heritable. **Germline** – Affects egg/sperm cells; heritable to offspring.

### Section C
5. **Recombinant Hepatitis B Vaccine:**
   - HBsAg gene isolated from Hepatitis B virus
   - Inserted into yeast expression vector
   - Yeast produces HBsAg protein
   - Purified protein used as vaccine
   - Safe as no live virus involved

6. **Ethical Issues with GMOs:** Biodiversity loss, unknown long-term health effects, corporate monopoly on seeds, horizontal gene transfer risk, socioeconomic impact on small farmers, labeling and consumer rights.');
