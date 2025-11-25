const fs = require('fs');
const path = require('path');

const OPTIONS_FILE = path.join(__dirname, '..', 'database', 'clinical_options.json');

function ensureFile() {
  if (!fs.existsSync(OPTIONS_FILE)) {
    const seed = {
      mood: ['Anxious', 'Sad', 'Cheerful', 'Agitated', 'Fearful', 'Irritable'],
      behaviour: ['Suspiciousness','Talking/Smiling to self','Hallucinatory behaviour','Increased goal-directed activity','Compulsions','Apathy','Anhedonia','Avolution','Stupor','Posturing','Stereotypy','Ambitendency','Disinhibition','Impulsivity','Anger outbursts','Suicide/self-harm attempts'],
      speech: ['Irrelevant','Incoherent','Pressure','Alogia','Mutism'],
      thought: ['Reference','Persecution','Grandiose','Love Infidelity','Bizarre','Pessimism','Worthlessness','Guilt','Poverty','Nihilism','Hypochondriasis','Wish to die','Active suicidal ideation','Plans','Worries','Obsessions','Phobias','Panic attacks'],
      perception: ['Hallucination - Auditory','Hallucination - Visual','Hallucination - Tactile','Hallucination - Olfactory','Passivity','Depersonalization','Derealization'],
      somatic: ['Pains','Numbness','Weakness','Fatigue','Tremors','Palpitations','Dyspnoea','Dizziness'],
      bio_functions: ['Sleep','Appetite','Bowel/Bladder','Self-care'],
      adjustment: ['Work output','Socialization'],
      cognitive_function: ['Disorientation','Inattention','Impaired Memory','Intelligence'],
      fits: ['Epileptic','Dissociative','Mixed','Not clear'],
      sexual_problem: ['Dhat','Poor erection','Early ejaculation','Decreased desire','Perversion','Homosexuality','Gender dysphoria'],
      substance_use: ['Alcohol','Opioid','Cannabis','Benzodiazepines','Tobacco'],
      associated_medical_surgical: ['Hypertension','Diabetes','Dyslipidemia','Thyroid dysfunction'],
      mse_behaviour: ['Uncooperative','Unkempt','Fearful','Odd','Suspicious','Retarded','Excited','Aggressive','Apathetic','Catatonic','Demonstrative'],
      mse_affect: ['Sad','Anxious','Elated','Inappropriate','Blunted','Labile'],
      mse_thought: ['Depressive','Suicidal','Obsessions','Hypochondriacal','Preoccupations','Worries'],
      mse_perception: ['Hallucinations - Auditory','Hallucinations - Visual','Hallucinations - Tactile','Hallucinations - Olfactory','Illusions','Depersonalization','Derealization'],
      mse_cognitive_function: ['Impaired','Not impaired'],
      past_history: [],
      family_history: []
    };
    fs.writeFileSync(OPTIONS_FILE, JSON.stringify(seed, null, 2));
  }
}

function readOptions() {
  ensureFile();
  const raw = fs.readFileSync(OPTIONS_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeOptions(data) {
  fs.writeFileSync(OPTIONS_FILE, JSON.stringify(data, null, 2));
}

class ClinicalOptionsController {
  static async getGroup(req, res) {
    try {
      const group = req.params.group;
      const options = readOptions();
      return res.json({ success: true, data: { group, options: options[group] || [] } });
    } catch (e) {
      console.error('get options error', e);
      res.status(500).json({ success: false, message: 'Failed to get options' });
    }
  }

  static async addOption(req, res) {
    try {
      const group = req.params.group;
      const { label } = req.body;
      if (!label || !label.trim()) return res.status(400).json({ success: false, message: 'Label is required' });
      const options = readOptions();
      const list = options[group] || [];
      if (!list.includes(label)) list.push(label);
      options[group] = list;
      writeOptions(options);
      res.status(201).json({ success: true, data: { group, options: list } });
    } catch (e) {
      console.error('add option error', e);
      res.status(500).json({ success: false, message: 'Failed to add option' });
    }
  }

  static async deleteOption(req, res) {
    try {
      const group = req.params.group;
      const { label } = req.body;
      const options = readOptions();
      const list = (options[group] || []).filter((o) => o !== label);
      options[group] = list;
      writeOptions(options);
      res.json({ success: true, data: { group, options: list } });
    } catch (e) {
      console.error('delete option error', e);
      res.status(500).json({ success: false, message: 'Failed to delete option' });
    }
  }
}

module.exports = ClinicalOptionsController;


