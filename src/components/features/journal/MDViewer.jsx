import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import styles from '../../../pages/Journal.module.css';

const MDViewer = React.forwardRef(({ file, fontSize, onTocGenerated }, ref) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 生成稳定的ID (slug)
  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\s/]+/g, '-') // 将空格和斜杠替换为连字符
      .replace(/[^\w-]/g, '') // 移除特殊字符
      .replace(/^-+|-+$/g, ''); // 移除前后的连字符
  };

  // 提取目录的函数
  const extractToc = useCallback(
    (markdown) => {
      const lines = markdown.split('\n');
      const toc = [];

      lines.forEach((line, index) => {
        if (line.startsWith('# ')) {
          const title = line.replace('# ', '').trim();
          const id = `heading-${generateSlug(title)}`;
          toc.push({
            id: id,
            title: title,
            level: 1,
            lineIndex: index,
          });
        } else if (line.startsWith('## ')) {
          const title = line.replace('## ', '').trim();
          const id = `heading-${generateSlug(title)}`;
          toc.push({
            id: id,
            title: title,
            level: 2,
            lineIndex: index,
          });
        } else if (line.startsWith('### ')) {
          const title = line.replace('### ', '').trim();
          const id = `heading-${generateSlug(title)}`;
          toc.push({
            id: id,
            title: title,
            level: 3,
            lineIndex: index,
          });
        }
      });

      if (onTocGenerated) {
        onTocGenerated(toc);
      }

      return toc;
    },
    [onTocGenerated]
  );

  // 加载 Markdown 文件
  useEffect(() => {
    const loadMarkdown = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(file);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        let text = await response.text();
        // 移除HTML注释
        text = text.replace(/<!--[\s\S]*?-->/g, '');
        setContent(text);
        extractToc(text);
        setError(null);
      } catch (err) {
        console.error('加载Markdown失败:', err);
        setError(`无法加载文件：${file}`);
        setContent('# 加载失败\n\n请检查文件路径是否正确。');
      } finally {
        setIsLoading(false);
      }
    };

    loadMarkdown();
  }, [file, extractToc]);

  // 自定义渲染组件
  const components = {
    // 代码块高亮
    code({ inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },

    // 标题 - 添加锚点
    h1: ({ children, ...props }) => {
      const text = typeof children === 'string' ? children : '';
      return (
        <h1 id={`heading-${generateSlug(text)}`} {...props}>
          {children}
        </h1>
      );
    },
    h2: ({ children, ...props }) => {
      const text = typeof children === 'string' ? children : '';
      return (
        <h2 id={`heading-${generateSlug(text)}`} {...props}>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }) => {
      const text = typeof children === 'string' ? children : '';
      return (
        <h3 id={`heading-${generateSlug(text)}`} {...props}>
          {children}
        </h3>
      );
    },

    // 图片处理
    img: ({ src, alt, ...props }) => {
      // 处理相对路径图片
      const imageSrc = src.startsWith('http') ? src : `${window.location.origin}${src}`;
      return (
        <div className={styles.mdImageContainer}>
          <img src={imageSrc} alt={alt} className={styles.mdImage} {...props} />
          {alt && <div className={styles.imageCaption}>{alt}</div>}
        </div>
      );
    },
  };

  return (
    <div className={styles.mdViewerContainer}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>正在加载Markdown...</p>
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          <p>❌ {error}</p>
        </div>
      )}

      <div ref={ref} className={styles.mdContent} style={{ fontSize: `${fontSize}px` }}>
        <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>

      {/* 显示字符统计 */}
      {!isLoading && !error && (
        <div className={styles.mdStats}>
          <span>总字符数: {content.length}</span>
          <span>行数: {content.split('\n').length}</span>
        </div>
      )}
    </div>
  );
});

MDViewer.displayName = 'MDViewer';
export default MDViewer;
