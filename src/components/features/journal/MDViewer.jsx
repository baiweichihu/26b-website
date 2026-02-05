import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
// rehype-raw allows rendering of raw HTML in markdown (e.g., <u>, <kbd>, <sub>, <sup>)
// Security note: This plugin allows arbitrary HTML rendering. Only use with trusted markdown sources.
// All markdown files in this project are stored in the repository and are trusted content.
import rehypeRaw from 'rehype-raw';
import styles from '../../../pages/Journal.module.css';

const MDViewer = React.forwardRef(
  (
    { file, files, onTocGenerated, activeSectionIndex, onSectionsGenerated, fontSize = 16 },
    ref
  ) => {
    const [fullContent, setFullContent] = useState('');
    const [sections, setSections] = useState([]);
    const [rawContent, setRawContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const sectionHeadingAssignedRef = React.useRef(false);

    // Get the base URL and markdown file directory for image resolution
    // Memoize these values to avoid recalculation on every render
    const baseUrl = React.useMemo(() => {
      const base = import.meta.env.BASE_URL || '/';
      // Ensure baseUrl ends with a slash for proper path joining
      return base.endsWith('/') ? base : `${base}/`;
    }, []);

    const fileList = React.useMemo(() => {
      if (Array.isArray(files) && files.length > 0) {
        return files;
      }
      if (file) {
        return [file];
      }
      return [];
    }, [files, file]);

    // 生成稳定的ID (slug)
    const generateSlug = React.useCallback(
      (text) =>
        text
          .toLowerCase()
          .trim()
          .replace(/[\s/]+/g, '-') // 将空格和斜杠替换为连字符
          .replace(/[^\w-]/g, '') // 移除特殊字符
          .replace(/^-+|-+$/g, ''), // 移除前后的连字符
      []
    );

    const resolveImagePath = React.useCallback(
      (src, sourceFile) => {
        if (
          !src ||
          src.startsWith('http://') ||
          src.startsWith('https://') ||
          src.startsWith('data:')
        ) {
          return src;
        }

        const sourceDirectory = sourceFile
          ? sourceFile.substring(0, sourceFile.lastIndexOf('/') + 1)
          : '/';

        let normalizedPath;
        if (src.startsWith('/')) {
          if (sourceDirectory && src.startsWith('/img/')) {
            normalizedPath = `${sourceDirectory}${src.replace(/^\/+/, '')}`;
          } else {
            normalizedPath = src;
          }
        } else if (src.startsWith('./') || src.startsWith('../')) {
          try {
            const basePathUrl = new URL(sourceDirectory, window.location.origin);
            const resolvedUrl = new URL(src, basePathUrl);
            normalizedPath = resolvedUrl.pathname;
          } catch (error) {
            console.warn('Failed to resolve relative image path:', src, error);
            normalizedPath = sourceDirectory + src;
          }
        } else {
          normalizedPath = sourceDirectory + src;
        }

        if (normalizedPath.startsWith(baseUrl)) {
          return normalizedPath;
        }

        const cleanPath = normalizedPath.replace(/^\/+/, '');
        return baseUrl + cleanPath;
      },
      [baseUrl]
    );

    const normalizeMarkdownImages = React.useCallback(
      (markdown, sourceFile) => {
        const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        const htmlImageRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;

        let updated = markdown.replace(markdownImageRegex, (match, alt, src) => {
          const trimmedSrc = src.trim();
          const normalizedSrc = resolveImagePath(trimmedSrc, sourceFile);
          return `![${alt}](${normalizedSrc})`;
        });

        updated = updated.replace(htmlImageRegex, (match, src) => {
          const normalizedSrc = resolveImagePath(src.trim(), sourceFile);
          return match.replace(src, normalizedSrc);
        });

        return updated;
      },
      [resolveImagePath]
    );

    // 提取目录并按二级标题分页
    const buildSections = useCallback(
      (markdown) => {
        const lines = markdown.split('\n');
        const toc = [];
        const sectionsList = [];
        const slugCounts = new Map();
        let currentId = '';
        let currentTitle = '';
        let currentLines = [];
        const leadingLines = [];

        const createUniqueId = (title) => {
          const baseSlug = generateSlug(title);
          const currentCount = slugCounts.get(baseSlug) || 0;
          slugCounts.set(baseSlug, currentCount + 1);
          const suffix = currentCount > 0 ? `-${currentCount + 1}` : '';
          return `heading-${baseSlug}${suffix}`;
        };

        lines.forEach((line) => {
          if (line.startsWith('## ')) {
            if (currentId) {
              sectionsList.push({
                id: currentId,
                title: currentTitle,
                content: currentLines.join('\n').trimEnd(),
              });
            }

            if (leadingLines.length > 0) {
              currentLines = [...leadingLines];
              leadingLines.length = 0;
            } else {
              currentLines = [];
            }

            currentTitle = line.replace('## ', '').trim();
            currentId = createUniqueId(currentTitle);
            toc.push({
              id: currentId,
              title: currentTitle,
              level: 2,
            });
            currentLines.push(line);
          } else if (!currentId) {
            leadingLines.push(line);
          } else {
            currentLines.push(line);
          }
        });

        if (currentId) {
          sectionsList.push({
            id: currentId,
            title: currentTitle,
            content: currentLines.join('\n').trimEnd(),
          });
        }

        if (sectionsList.length === 0) {
          sectionsList.push({
            id: 'section-1',
            title: '正文',
            content: markdown.trimEnd(),
          });
        }

        return { sectionsList, toc };
      },
      [generateSlug]
    );

    // 加载 Markdown 文件
    useEffect(() => {
      const loadMarkdown = async () => {
        try {
          setIsLoading(true);
          const responses = await Promise.all(
            fileList.map(async (filePath) => {
              const response = await fetch(filePath);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              let text = await response.text();
              const trimmed = text.trim();
              const htmlIndicators = [
                '<!DOCTYPE',
                '<html',
                '<head',
                '<body',
                '<script',
                '<meta',
                '<link',
                '<title>',
              ];
              const isHtml = htmlIndicators.some((indicator) =>
                trimmed.toLowerCase().startsWith(indicator.toLowerCase())
              );
              if (isHtml) {
                throw new Error('Received HTML instead of markdown');
              }
              text = text.replace(/<!--[\s\S]*?-->/g, '');
              return { filePath, text: text.trimEnd() };
            })
          );

          const rawText = responses.map((item) => item.text).join('\n\n');
          const normalizedText = responses
            .map((item) => normalizeMarkdownImages(item.text, item.filePath))
            .join('\n\n---\n\n')
            .trimEnd();

          const { sectionsList, toc } = buildSections(normalizedText);
          setRawContent(rawText);
          setFullContent(normalizedText);
          setSections(sectionsList);

          if (onTocGenerated) {
            onTocGenerated(toc);
          }

          if (onSectionsGenerated) {
            onSectionsGenerated(sectionsList.map((item) => ({ id: item.id, title: item.title })));
          }
          setError(null);
        } catch (err) {
          console.error('加载Markdown失败:', err);
          setError(`无法加载文件：${fileList.join(', ')}`);
          const fallbackContent = '# 加载失败\n\n请检查文件路径是否正确。';
          setFullContent(fallbackContent);
          setSections([
            {
              id: 'section-1',
              title: '正文',
              content: fallbackContent,
            },
          ]);
          setRawContent('');
        } finally {
          setIsLoading(false);
        }
      };

      loadMarkdown();
    }, [fileList, buildSections, normalizeMarkdownImages, onTocGenerated, onSectionsGenerated]);

    const safeSectionIndex = React.useMemo(() => {
      if (!sections || sections.length === 0) {
        return 0;
      }
      const rawIndex = Number.isFinite(activeSectionIndex) ? activeSectionIndex : 0;
      return Math.min(Math.max(rawIndex, 0), sections.length - 1);
    }, [sections, activeSectionIndex]);

    const activeSectionId = sections[safeSectionIndex]?.id || '';

    const displayContent = React.useMemo(() => {
      if (sections.length === 0) {
        return fullContent;
      }
      return sections[safeSectionIndex]?.content || fullContent;
    }, [sections, safeSectionIndex, fullContent]);

    useEffect(() => {
      sectionHeadingAssignedRef.current = false;
    }, [displayContent, activeSectionId]);

    useEffect(() => {
      const container = ref && typeof ref !== 'function' ? ref.current : null;
      if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, [activeSectionIndex, ref]);

    // 自定义渲染组件
    const components = {
      // 代码块高亮
      code({ inline, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        const text = String(children).replace(/\n$/, '');

        if (!inline) {
          if (text.trim().length === 0) {
            return null;
          }
          return (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match ? match[1] : 'text'}
              PreTag="div"
              {...props}
            >
              {text}
            </SyntaxHighlighter>
          );
        }

        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      pre: ({ children }) => <>{children}</>,

      // 标题 - 添加锚点
      h1: ({ children, ...props }) => {
        const text = typeof children === 'string' ? children : '';
        const id = `heading-${generateSlug(text)}`;
        return (
          <h1 id={id} {...props}>
            {children}
          </h1>
        );
      },
      h2: ({ children, ...props }) => {
        const text = typeof children === 'string' ? children : '';
        const id = sectionHeadingAssignedRef.current
          ? `heading-${generateSlug(text)}`
          : activeSectionId || `heading-${generateSlug(text)}`;
        sectionHeadingAssignedRef.current = true;
        return (
          <h2 id={id} {...props}>
            {children}
          </h2>
        );
      },
      h3: ({ children, ...props }) => {
        const text = typeof children === 'string' ? children : '';
        const id = `heading-${generateSlug(text)}`;
        return (
          <h3 id={id} {...props}>
            {children}
          </h3>
        );
      },

      // 图片处理
      img: ({ src, alt, ...props }) => (
        <div className={styles.mdImageContainer}>
          <img src={src} alt={alt} className={styles.mdImage} {...props} />
          {alt && <div className={styles.imageCaption}>{alt}</div>}
        </div>
      ),
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
          <ReactMarkdown
            components={components}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
          >
            {displayContent}
          </ReactMarkdown>
        </div>

        {/* 显示字符统计 */}
        {!isLoading && !error && (
          <div className={styles.mdStats}>
            <span>总字符数: {rawContent.length}</span>
            <span>行数: {rawContent ? rawContent.split('\n').length : 0}</span>
          </div>
        )}
      </div>
    );
  }
);

MDViewer.displayName = 'MDViewer';
export default MDViewer;
