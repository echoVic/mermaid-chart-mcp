import puppeteer from 'puppeteer';

async function testPuppeteerMermaid() {
    console.log('🚀 启动Puppeteer测试...');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // 创建HTML页面内容
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11.7.0/dist/mermaid.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js"></script>
</head>
<body>
    <div id="mermaid-container"></div>
    
    <script>
        // 初始化Mermaid
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose'
        });
        
        // 渲染函数
        window.renderMermaid = async function(mermaidCode) {
            try {
                const { svg } = await mermaid.render('diagram-id', mermaidCode);
                return svg;
            } catch (error) {
                throw new Error('Mermaid渲染失败: ' + error.message);
            }
        };
    </script>
</body>
</html>
        `;
        
        // 设置页面内容
        await page.setContent(htmlContent);
        
        // 等待Mermaid加载完成
        await page.waitForFunction(() => typeof window.mermaid !== 'undefined' && typeof window.renderMermaid !== 'undefined');
        
        // 测试Mermaid代码
        const mermaidCode = `
graph TD
    A[开始] --> B{是否成功?}
    B -->|是| C[继续]
    B -->|否| D[重试]
    D --> B
    C --> E[结束]
        `;
        
        console.log('📊 渲染Mermaid图表...');
        
        // 在页面中执行渲染
        const svg = await page.evaluate(async (code) => {
            return await window.renderMermaid(code);
        }, mermaidCode);
        
        console.log('✅ Puppeteer渲染成功！');
        console.log('📄 SVG长度:', svg.length);
        console.log('🔍 SVG预览:', svg.substring(0, 200) + '...');
        
        return svg;
        
    } catch (error) {
        console.error('❌ Puppeteer测试失败:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

// 运行测试
testPuppeteerMermaid()
    .then(() => console.log('🎉 测试完成'))
    .catch(error => {
        console.error('💥 测试失败:', error);
        process.exit(1);
    }); 