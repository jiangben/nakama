const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 检查文本是否需要转换为翻译格式
function shouldTranslate(text) {
    if (!text || text.length < 2) return false;
    
    // 排除不需要转换的内容
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
        /translate}}/,                  // 已经有翻译管道的文本
        /^[\s\r\n]*$/,                  // 空白字符
        /^[{}()\[\]]/,                  // 括号
        /\.(svg|png|jpg)$/i,            // 图片文件
        /^(Create Time|Remove|State|Subject|Recorded delete|Button group with nested dropdown)$/i, // 排除特定表单头和文本
    ];
    
    return !excludePatterns.some(pattern => pattern.test(text));
}

// 转义文本中的单引号
function escapeText(text) {
    return text.replace(/'/g, "\\'");
}

function convertHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 1. 转换标签内的纯文本
    content = content.replace(
        />([^<>{}]+)</g,
        (match, text) => {
            text = text.trim();
            if (shouldTranslate(text)) {
                modified = true;
                return `>{{'${escapeText(text)}' | translate}}<`;
            }
            return match;
        }
    );

    // 处理标签属性中的文本
    const attributePatterns = [
        /placeholder="([^"]+)"/g,
        /title="([^"]+)"/g,
        /label="([^"]+)"/g,
        /for="([^"]+)"/g
        // 不处理 aria-label
    ];

    attributePatterns.forEach(pattern => {
        content = content.replace(
            pattern,
            (match, text) => {
                if (shouldTranslate(text)) {
                    modified = true;
                    return match.replace(text, `{{'${escapeText(text)}' | translate}}`);
                }
                return match;
            }
        );
    });

    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`已更新文件: ${filePath}`);
    }
}

// 主函数
async function convertToTranslations() {
    const files = glob.sync('src/app/**/*.html', {
        ignore: [
            '**/**.spec.ts',  // 忽略测试文件
        ]
    });
    
    console.log('开始转换HTML文件...');
    
    files.forEach(file => {
        console.log(`处理文件: ${file}`);
        convertHtmlFile(file);
    });
    
    console.log('\n转换完成!');
}

convertToTranslations();