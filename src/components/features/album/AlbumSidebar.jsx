import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './AlbumSidebar.module.css';

const EXPANDED_STORAGE_KEY = 'album.sidebar.expandedIds';

const buildTree = (folders) => {
  const folderMap = new Map();
  const roots = [];

  folders.forEach((folder) => {
    folderMap.set(folder.id, { ...folder, children: [] });
  });

  folderMap.forEach((folder) => {
    if (folder.parent_id && folderMap.has(folder.parent_id)) {
      folderMap.get(folder.parent_id).children.push(folder);
    } else {
      roots.push(folder);
    }
  });

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);
  return roots;
};

const AlbumSidebar = ({ folders, currentFolder, onNavigateToFolder }) => {
  const navigate = useNavigate();
  const { folderId } = useParams();
  const tree = useMemo(() => buildTree(folders || []), [folders]);
  const [expandedIds, setExpandedIds] = useState(() => {
    try {
      const raw = localStorage.getItem(EXPANDED_STORAGE_KEY);
      if (!raw) return new Set();
      const ids = JSON.parse(raw);
      return Array.isArray(ids) ? new Set(ids) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(Array.from(expandedIds)));
    } catch {
      // ignore storage errors
    }
  }, [expandedIds]);

  const handleRootClick = () => {
    navigate('/album');
  };

  const handleFolderClick = (folder) => {
    onNavigateToFolder(folder.id);
  };

  const handleToggleExpand = (event, folderIdToToggle) => {
    event.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderIdToToggle)) {
        next.delete(folderIdToToggle);
      } else {
        next.add(folderIdToToggle);
      }
      return next;
    });
  };

  const renderNode = (folder, depth = 1) => {
    const active = folderId === folder.id;
    const hasChildren = folder.children.length > 0;
    const expanded = expandedIds.has(folder.id);

    return (
      <React.Fragment key={folder.id}>
        <div
          className={`${styles.folderItem} ${active ? styles.active : ''}`}
          onClick={() => handleFolderClick(folder)}
        >
          <span className={styles.indent} style={{ width: `${depth * 14}px` }} aria-hidden="true" />
          {hasChildren ? (
            <button
              type="button"
              className={`${styles.expandButton} ${expanded ? styles.expanded : ''}`}
              onClick={(event) => handleToggleExpand(event, folder.id)}
              aria-label={expanded ? '收起子目录' : '展开子目录'}
            >
              <i className={`fas fa-play ${styles.branchArrow}`} aria-hidden="true"></i>
            </button>
          ) : (
            <span className={styles.expandPlaceholder} aria-hidden="true" />
          )}
          <i className="fas fa-folder me-2" aria-hidden="true"></i>
          <span className={styles.folderName}>{folder.title}</span>
        </div>

        {expanded && folder.children.map((child) => renderNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h3 className={styles.sidebarTitle}>
          <i className="fas fa-images me-2"></i>
          班级相册
        </h3>
      </div>
      
      <div className={styles.sidebarContent}>
        <div className={styles.folderTree}>
          <div
            className={`${styles.folderItem} ${!folderId ? styles.active : ''}`}
            onClick={handleRootClick}
          >
            <i className="fas fa-house me-2"></i>
            <span className={styles.folderName}>主页</span>
          </div>

          {tree.map((folder) => renderNode(folder, 1))}
        </div>
      </div>

      {/* 当前文件夹路径显示 */}
      {currentFolder && (
        <div className={styles.currentPath}>
          <div className={styles.pathHeader}>当前路径</div>
          <div className={styles.pathItems}>
            <span 
              className={styles.pathItem}
              onClick={handleRootClick}
            >
              主页
            </span>
            <span className={styles.pathSeparator}>/</span>
            <span className={styles.pathItemCurrent}>
              {currentFolder.title}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumSidebar;