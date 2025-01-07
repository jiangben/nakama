const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 提取HTML文件中的文本
function extractFromHtml(content) {
    const texts = new Set();
    
    // 1. 提取标签内的纯文本
    const textRegex = />([^<>{}]+)</g;
    let match;
    while ((match = textRegex.exec(content)) !== null) {
        const text = match[1].trim();
        if (isValidTranslationText(text)) {
            texts.add(text);
        }
    }
    
    // 2. 提取翻译管道文本 {{'text' | translate}}
    const translateRegex = /{{['"]([^'"]+)['"][\s]*\|[\s]*translate}}/g;
    while ((match = translateRegex.exec(content)) !== null) {
        const text = match[1].trim();
        if (isValidTranslationText(text)) {
            texts.add(text);
        }
    }
    
    // 3. 提取占位符文本
    const placeholderRegex = /placeholder="([^"]+)"/g;
    while ((match = placeholderRegex.exec(content)) !== null) {
        const text = match[1].trim();
        if (isValidTranslationText(text)) {
            texts.add(text);
        }
    }

    // 4. 提取 title 属性文本
    const titleRegex = /title="([^"]+)"/g;
    while ((match = titleRegex.exec(content)) !== null) {
        const text = match[1].trim();
        if (isValidTranslationText(text)) {
            texts.add(text);
        }
    }
    
    return Array.from(texts);
}

// 提取TypeScript文件中的文本
function extractFromTs(content) {
    const texts = new Set();
    
    // 提取错误消息和提示文本
    const patterns = [
        /this\.error\s*=\s*['"]([^'"]+)['"]/g,
        /message:\s*['"]([^'"]+)['"]/g,
        /title:\s*['"]([^'"]+)['"]/g,
        /label:\s*['"]([^'"]+)['"]/g
    ];
    
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const text = match[1].trim();
            if (isValidTranslationText(text)) {
                texts.add(text);
            }
        }
    });
    
    return Array.from(texts);
}

// 验证文本是否需要翻译
function isValidTranslationText(text) {
    if (!text || text.length < 2) return false;
    
    // 排除不需要翻译的内容
    const excludePatterns = [
        /^[0-9.]+$/,                    // 纯数字
        /^https?:\/\//,                 // URL
        /\.(ts|js|html|css|scss)$/,     // 文件扩展名
        /^[@/]/,                        // 以@或/开头的路径
        /^[{}\[\]]/,                    // 以括号开头的代码片段
        /\${/,                          // 模板字符串
        /^[a-z_]+$/i,                   // 纯字母或下划线的变量名
        /\s*{\s*[a-zA-Z]+\s*}\s*/,     // 插值表达式
        /^<[^>]+>$/,                    // HTML标签
        /^['"]/,                        // 以引号开头的字符串
        /="[^"]*"$/,                    // HTML属性
        /^[\s\r\n]*$/,                  // 空白字符
        /^[{}()\[\]]/,                  // 括号
        /\.(svg|png|jpg)$/i,            // 图片文件
        /^(Create Time|Remove|State|Subject)$/i, // 排除特定表单头
    ];
    
    return !excludePatterns.some(pattern => pattern.test(text));
}

// 主函数
async function extractTranslations() {
    // 读取现有的翻译文件
    let existingEnTranslations = {};
    let existingZhTranslations = {};
    
    const enPath = 'src/assets/i18n/en.json';
    const zhPath = 'src/assets/i18n/zh.json';
    
    try {
        if (fs.existsSync(enPath)) {
            existingEnTranslations = JSON.parse(fs.readFileSync(enPath, 'utf8'));
        }
        if (fs.existsSync(zhPath)) {
            existingZhTranslations = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
        }
    } catch (error) {
        console.warn('无法读取现有翻译文件:', error);
    }

    const translations = {};
    
    // 只扫描组件相关文件
    const files = glob.sync('src/app/**/*.{html,ts}', {
        ignore: [
            '**/**.spec.ts',           // 忽略测试文件
            '**/**.module.ts',         // 忽略模块文件
            '**/**.routing.ts',        // 忽略路由文件
            '**/**.service.ts',        // 忽略服务文件
            '**/**.interceptor.ts',    // 忽略拦截器文件
            '**/**.guard.ts',          // 忽略守卫文件
        ]
    });
    
    files.forEach(file => {
        console.log(`Processing file: ${file}`);
        const content = fs.readFileSync(file, 'utf8');
        const texts = file.endsWith('.html') 
            ? extractFromHtml(content)
            : extractFromTs(content);
            
        texts.forEach(text => {
            if (text) {
                translations[text] = text;
                console.log(`Found text: ${text}`);
            }
        });
    });
    
    // 合并翻译
    const mergedEnTranslations = {
        ...existingEnTranslations,  // 保留现有翻译
        ...translations             // 添加新发现的文本
    };
    
    const mergedZhTranslations = {
        ...existingZhTranslations,  // 保留现有中文翻译
        ...translations             // 对于新文本，先用英文占位
    };
    
    // 保存合并后的翻译文件
    fs.writeFileSync(
        enPath,
        JSON.stringify(mergedEnTranslations, null, 2)
    );
    
    fs.writeFileSync(
        zhPath,
        JSON.stringify(mergedZhTranslations, null, 2)
    );
    
    console.log('\n翻译提取完成!');
    console.log(`总共发现的文本数: ${Object.keys(translations).length}`);
    console.log(`合并后的文本数: ${Object.keys(mergedEnTranslations).length}`);
}

extractTranslations(); 