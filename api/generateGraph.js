// קובץ: api/generate-graph.js

const { createCanvas, registerFont } = require('canvas');
const path = require('path');

// --- "תרגום" של פונקציות p5.js ופונקציות עזר ---

// פונקציית map שמקבילה לזו של p5.js
function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}

// פונקציית random שמקבילה לזו של p5.js
function random(min, max) {
    if (min === undefined) {
        return Math.random();
    }
    if (max === undefined) {
        max = min;
        min = 0;
    }
    return Math.random() * (max - min) + min;
}

// המרה של ציונים (0, 1, 2, 3) לגודל יחסי על הגרף
const scores = [0.2, 0.4, 0.6, 0.9]; // 0=לא בוצע, 3=בוצע מעולה
function getScore(value) {
    // אם הערך לא תקין, החזר את הערך הנמוך ביותר
    return (value >= 0 && value < scores.length) ? scores[value] : scores[0];
}

// פונקציית עזר לציור הצורה של החניך (עם קו מקווקו)
function drawStudentShape(ctx, points) {
    ctx.save(); // מקביל ל-push()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.23)'; // fill(0, 60) -> alpha = 60/255
    ctx.strokeStyle = 'rgba(40, 40, 40, 1)'; // stroke(40)
    ctx.lineWidth = 4;
    ctx.setLineDash([5, 10]); // קו מקווקו
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    
    ctx.stroke();
    ctx.fill();
    
    ctx.restore(); // מקביל ל-pop()
}

// פונקציית עזר לציור הצורה של המאסטר (עם מילוי נקודות)
function drawTeacherShape(ctx, points) {
    const { width, height } = ctx.canvas;
    
    ctx.save();
    
    // יצירת מסכת חיתוך (Clipping Mask) בצורת הפוליגון
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.clip();

    // ציור הרקע והנקודות בתוך המסכה
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // background(0, 50)
    ctx.fillRect(-width / 2, -height / 2, width, height);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // fill(0, 50)
    for (let x = -width / 2; x < width / 2; x += 7) {
        for (let y = -height / 2; y < height / 2; y += 7) {
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, 2 * Math.PI); // circle(x,y,4) -> radius 2
            ctx.fill();
        }
    }
    
    ctx.restore();
}

/**
 * פונקציה מרכזית לציור הגרף על הקנבס.
 * @param {CanvasRenderingContext2D} ctx - הקונטקסט של הקנבס לציור.
 * @param {object[]} values - מערך הנתונים, למשל [{ label: 'חקר', student: 2, master: 2 }]
 */
function drawGraph(ctx, values) {
    const { width, height } = ctx.canvas;
    const radius = Math.min(width, height) * 0.375; // רדיוס הגרף הראשי

    // 1. הזזת מרכז הקנבס לאמצע (כמו translate())
    ctx.translate(width / 2, height / 2);

    // 2. חישוב נקודות הבסיס על המעגל החיצוני
    const basePoints = [];
    for (let i = 0; i < values.length; i++) {
        // המרה לזוויות (0 מעלות הוא בצד ימין, נזיז ב-90- כדי להתחיל מלמעלה)
        const angle = map(i, 0, values.length, -90, 270); 
        const radAngle = angle * (Math.PI / 180); // המרה לרדיאנים
        const x = Math.cos(radAngle) * radius;
        const y = Math.sin(radAngle) * radius;
        basePoints.push({ x, y });
    }

    // 3. ציור הרשת והקווים
    // ציור המעגל החיצוני
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(basePoints[0].x, basePoints[0].y);
    basePoints.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();

    // ציור מעגלי העזר הפנימיים
    ctx.lineWidth = 1;
    scores.forEach(s => {
        ctx.beginPath();
        const innerRadius = radius * s;
        ctx.arc(0, 0, innerRadius, 0, 2 * Math.PI);
        ctx.stroke();
    });
    
    // ציור הקווים מהמרכז וטקסט התוויות
    values.forEach((v, i) => {
        const pos = basePoints[i];
        
        // קו מהמרכז
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        
        // טקסט התווית
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '20px Assistant';
        ctx.fillStyle = 'black';
        ctx.fillText(v.label, pos.x * 1.2, pos.y * 1.2);
    });

    // 4. חישוב וציור צורת החניך
    const studentPoints = values.map((v, i) => {
        const scoreValue = getScore(v.student);
        return {
            x: basePoints[i].x * scoreValue + random(-5, 5), // רנדומיות מופחתת
            y: basePoints[i].y * scoreValue + random(-5, 5),
        };
    });
    drawStudentShape(ctx, studentPoints);

    // 5. חישוב וציור צורת המאסטר
    const teacherPoints = values.map((v, i) => {
        const scoreValue = getScore(v.master);
        return {
            x: basePoints[i].x * scoreValue + random(-5, 5),
            y: basePoints[i].y * scoreValue + random(-5, 5),
        };
    });
    drawTeacherShape(ctx, teacherPoints);
}


// --- הפונקציה הראשית שמטפלת בבקשת ה-HTTP ---
module.exports = async (req, res) => {
    try {
        if (req.method !== 'POST') {
            res.setHeader('Allow', ['POST']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
        }

        // קבלת הנתונים מה-POST body
        // הנתונים צריכים להיות מערך בשם "values"
        const { values } = req.body;
        if (!values || !Array.isArray(values)) {
            return res.status(400).json({ error: 'Request body must contain a "values" array.' });
        }

        const width = 800;
        const height = 800;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // רישום פונט עברי
        // ודא שיש לך תיקייה 'fonts' עם הקובץ בתוכה
        try {
            registerFont(path.resolve('./fonts/Assistant-Regular.ttf'), { family: 'Assistant' });
        } catch (e) {
            console.warn("Could not register font. Using default.");
        }

        // קריאה לפונקציית הציור המרכזית
        drawGraph(ctx, values);

        const buffer = canvas.toBuffer('image/png');

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', buffer.length);
        res.status(200).send(buffer);

    } catch (error) {
        console.error('Error generating image:', error);
        res.status(500).json({ error: 'Failed to generate image', details: error.message });
    }
};