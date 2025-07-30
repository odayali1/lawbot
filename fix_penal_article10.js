const mongoose = require('mongoose');
const LegalDocument = require('./models/LegalDocument');
require('dotenv').config();

async function fixPenalArticle10() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lawbot');
        console.log('Connected to MongoDB');
        
        const penalDocs = await LegalDocument.find({ type: 'criminal_code' });
        console.log(`Found ${penalDocs.length} penal code documents`);
        
        // Find the document that contains the definitions (Article 10 content)
        let targetDoc = null;
        for (let doc of penalDocs) {
            if (doc.content && doc.content.includes('الإجراءات القضائية')) {
                targetDoc = doc;
                break;
            }
        }
        
        if (targetDoc) {
            console.log(`\nProcessing document: ${targetDoc.title}`);
            console.log('Content preview:', targetDoc.content.substring(0, 200));
            
            // Create Article 10 based on the definitions found in the content
            const article10Text = `المادة 10: تعريفات

في هذا القانون، ما لم تدل القرينة على خلاف ذلك:

1. تشمل عبارة (الإجراءات القضائية): كافة الإجراءات التي تتخذ أمام أية محكمة، أو مدعي عام، أو مجلس قضائي، أو لجنة تحقيق، أو شخص يجوز أداء الشهادة أمامها أو أمامه بعد حلف اليمين سواء قامت هذه المحكمة، أو المجلس القضائي، أو اللجنة، أو ذلك الشخص باليمين أو بدون اليمين.

2. تعني عبارة (بيت السكن): المحل المخصص للسكن أو أي قسم من بناية اتخذه المالك أو الساكن مسكناً له ولعائلته وضيوفه وخدمه أو لأي منهم وإن لم يكن مسكوناً بالفعل وقت ارتكاب الجريمة، وتشمل أيضاً توابعه وملحقاته المتصلة التي يضمها معه سور واحد.

3. تشمل عبارة (الطريق العام): كل طريق يباح للجمهور المرور فيه.`;
            
            // Create the article object
            const article10 = {
                number: 10,
                text: article10Text,
                arabicText: article10Text
            };
            
            // Update the document with Article 10
            targetDoc.articles = [article10];
            
            // Update search index
            targetDoc.searchIndex = {
                fullText: article10Text,
                keywords: article10Text.split(/\s+/).filter(word => word.length > 2)
            };
            
            await targetDoc.save();
            console.log('\n=== SUCCESSFULLY ADDED ARTICLE 10 ===');
            console.log(article10Text);
            console.log('\n=== DOCUMENT UPDATED ===');
            
        } else {
            console.log('No document found with penal code definitions');
        }
        
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
    }
}

fixPenalArticle10();