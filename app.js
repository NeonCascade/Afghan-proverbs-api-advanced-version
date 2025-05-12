import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PROVERBS_FILE = path.join(__dirname, 'data', 'proverbs.json');

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Helper functions for JSON operations
async function readProverbs() {
    try {
        const data = await fs.readFile(PROVERBS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, create it with empty array
            await fs.writeFile(PROVERBS_FILE, '[]');
            return [];
        }
        throw error;
    }
}

async function writeProverbs(proverbs) {
    await fs.writeFile(PROVERBS_FILE, JSON.stringify(proverbs, null, 2));
}

// Routes
app.get('/', async (req, res) => {
    try {
        const proverbs = await readProverbs();
        res.render('home', { proverbs });
    } catch (error) {
        console.error('Error reading proverbs:', error);
        res.render('home', { proverbs: [], error: 'Failed to load proverbs' });
    }
});

app.get('/proverb/:id', async (req, res) => {
    try {
        const proverbs = await readProverbs();
        const proverb = proverbs.find(p => p.id === parseInt(req.params.id));
        
        if (!proverb) {
            return res.redirect('/?error=Proverb not found');
        }
        
        res.render('proverb-details', { proverb });
    } catch (error) {
        console.error('Error fetching proverb:', error);
        res.redirect('/?error=Failed to load proverb');
    }
});

app.get('/add-proverb', (req, res) => {
    res.render('add-proverb', { 
        error: null, 
        formData: {
            textDari: '',
            textPashto: '',
            translationEn: '',
            meaning: '',
            category: 'wisdom'
        }
    });
});

app.post('/add-proverb', async (req, res) => {
    try {
        // Validate required fields
        if (!req.body.textDari || !req.body.textPashto || !req.body.translationEn || !req.body.category) {
            return res.render('add-proverb', { 
                error: 'Please fill in all required fields', 
                formData: req.body 
            });
        }

        const proverbs = await readProverbs();
        const newProverb = {
            id: proverbs.length > 0 ? Math.max(...proverbs.map(p => p.id)) + 1 : 1,
            textDari: req.body.textDari,
            textPashto: req.body.textPashto,
            translationEn: req.body.translationEn,
            meaning: req.body.meaning || '', // Make sure meaning exists even if empty
            category: req.body.category
        };
        
        proverbs.push(newProverb);
        await writeProverbs(proverbs);
        res.redirect('/?success=Proverb added successfully');
    } catch (error) {
        console.error('Error adding proverb:', error);
        res.render('add-proverb', { 
            error: 'Failed to add proverb', 
            formData: req.body 
        });
    }
});

app.get('/edit-proverb/:id', async (req, res) => {
    try {
        const proverbs = await readProverbs();
        const proverb = proverbs.find(p => p.id === parseInt(req.params.id));
        
        if (!proverb) {
            return res.redirect('/?error=Proverb not found');
        }
        
        res.render('edit-proverb', { proverb });
    } catch (error) {
        console.error('Error fetching proverb for edit:', error);
        res.redirect('/?error=Failed to load proverb');
    }
});

app.post('/edit-proverb/:id', async (req, res) => {
    try {
        const proverbs = await readProverbs();
        const index = proverbs.findIndex(p => p.id === parseInt(req.params.id));
        
        if (index === -1) {
            return res.redirect('/?error=Proverb not found');
        }
        
        proverbs[index] = {
            ...proverbs[index],
            textDari: req.body.textDari,
            textPashto: req.body.textPashto,
            translationEn: req.body.translationEn,
            meaning: req.body.meaning,
            category: req.body.category
        };
        
        await writeProverbs(proverbs);
        res.redirect(`/proverb/${req.params.id}?success=Proverb updated successfully`);
    } catch (error) {
        console.error('Error updating proverb:', error);
        res.render('edit-proverb', { 
            proverb: { ...req.body, id: req.params.id }, 
            error: 'Failed to update proverb' 
        });
    }
});

app.post('/delete-proverb/:id', async (req, res) => {
    try {
        const proverbs = await readProverbs();
        const filteredProverbs = proverbs.filter(p => p.id !== parseInt(req.params.id));
        
        if (proverbs.length === filteredProverbs.length) {
            return res.redirect(`/proverb/${req.params.id}?error=Proverb not found`);
        }
        
        await writeProverbs(filteredProverbs);
        res.redirect('/?success=Proverb deleted successfully');
    } catch (error) {
        console.error('Error deleting proverb:', error);
        res.redirect(`/proverb/${req.params.id}?error=Failed to delete proverb`);
    }
});

app.get('/random-proverb', async (req, res) => {
    try {
        const proverbs = await readProverbs();
        
        if (proverbs.length === 0) {
            return res.redirect('/?error=No proverbs available');
        }
        
        const randomIndex = Math.floor(Math.random() * proverbs.length);
        const proverb = proverbs[randomIndex];
        res.render('random-proverb', { proverb });
    } catch (error) {
        console.error('Error fetching random proverb:', error);
        res.redirect('/?error=Failed to get random proverb');
    }
});

// Initialize with sample data if empty
async function initializeData() {
    const proverbs = await readProverbs();
    if (proverbs.length === 0) {
        const sampleProverbs = [
            {
                "id": 1,
                "textDari": "با یک دست دو هندوانه نتوان گرفت",
                "textPashto": "په یوه الس دو هندوانې نه شي نیول کېدای",
                "translationEn": "You can't hold two watermelons in one hand",
                "meaning": "Don't take on more tasks than you can handle",
                "category": "wisdom"
            },
            {
                "id": 2,
                "textDari": "دوست از دوست بی نیاز",
                "textPashto": "ملګری له ملګري بې پروا",
                "translationEn": "A friend is never in need of a friend",
                "meaning": "True friends support each other",
                "category": "friendship"
            },
            {
                "id": 3,
                "textDari": "هر که بامش بیش، برفش بیشتر",
                "textPashto": "چا چې د ګرځې لوړوالی زیات وي، د برف کچه یې هم زیاتوي",
                "translationEn": "The higher the roof, the more snow it collects",
                "meaning": "Greater positions come with greater responsibilities",
                "category": "life"
            },
            {
                "id": 4,
                "textDari": "سگ زرد برادر شغال است",
                "textPashto": "ژېړ سپی د ګېډۍ ورور دی",
                "translationEn": "A yellow dog is a brother to the jackal",
                "meaning": "People of similar character stick together",
                "category": "wisdom"
            },
            {
                "id": 5,
                "textDari": "آب که از سر گذشت، چه یک وجب چه صد وجب",
                "textPashto": "چې اوبه له سر تیریږي، نو یو څوکه یا سل څوکه څه توپیر لري",
                "translationEn": "When water has passed over your head, what difference does it make if it's one span or a hundred?",
                "meaning": "Once you're in deep trouble, the extent doesn't matter",
                "category": "life"
            }
        ];
        await writeProverbs(sampleProverbs);
        console.log('Initialized with sample proverbs');
    }
}

// Start server
app.listen(PORT, async () => {
    await initializeData();
    console.log(`Server running on http://localhost:${PORT}`);
});