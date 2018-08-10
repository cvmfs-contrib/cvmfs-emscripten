mergeInto(LibraryManager.library, {
  $CVMFS__deps: ['$FS'],
  $CVMFS: {
    ops_table: null,
    mountroot: '/cvmfs',
    base_url: 'http://hepvm.cern.ch/cvmfs',
    mount: function(mount) {
      const repo_name = mount.opts.repo_name;
      const repo = new cvmfs.repo(this.base_url, repo_name);

      const manifest = repo.getManifest();
      const whitelist = repo.getWhitelist();
      const certificate = repo.getCertificate();
      console.log(manifest);
      console.log(whitelist);
      console.log(certificate);

      const node = CVMFS.createNode(null, '/', {{{ cDefine('S_IFDIR') }}} | 0777);
      node.catalog = repo.getCatalog(manifest.catalog_hash);
      node.repo = repo;

      cvmfs.cache.clearAll();

      return node;
    },
    createNode: function(parent, name, mode) {
      if (!CVMFS.ops_table) {
        CVMFS.ops_table = {
          dir: {
            node: {
              getattr: CVMFS.node_ops.getattr,
              lookup: CVMFS.node_ops.lookup,
              readdir: CVMFS.node_ops.readdir,
            },
            stream: {}
          },
          file: {
            node: {
              getattr: CVMFS.node_ops.getattr
            },
            stream: {
              read: CVMFS.stream_ops.read,
              llseek: CVMFS.stream_ops.llseek,
            }
          },
          link: {
            node: {
              getattr: CVMFS.node_ops.getattr,
              readlink: CVMFS.node_ops.readlink
            },
            stream: {}
          }
        };
      }

      var node = FS.createNode(parent, name, mode, 0);

      if (FS.isDir(node.mode)) {
        node.node_ops = CVMFS.ops_table.dir.node;
        node.stream_ops = CVMFS.ops_table.dir.stream;
      } else if (FS.isFile(node.mode)) {
        node.node_ops = CVMFS.ops_table.file.node;
        node.stream_ops = CVMFS.ops_table.file.stream;
      } else if (FS.isLink(node.mode)) {
        node.node_ops = CVMFS.ops_table.link.node;
        node.stream_ops = CVMFS.ops_table.link.stream;
      }

      if (parent !== null) {
        node.catalog = parent.catalog;
        node.repo = parent.repo;
        node.cvmfs_bindpoint = parent.cvmfs_bindpoint;
      }

      return node;
    },
    getRelativePath: function(node, path) {
      if (path === undefined)
        path = FS.getPath(node);

      if (node.cvmfs_bindpoint !== undefined)
        path = path.replace(node.cvmfs_bindpoint, '');
      else
        path = path.replace(node.mount.mountpoint, '');

      return path;
    },
    node_ops: {
      lookup: function(parent, name) {
        const path = CVMFS.getRelativePath(parent, PATH.join(FS.getPath(parent), name));
        const statinfo = parent.repo.getStatInfoForPath(parent.catalog, path);

        const node = CVMFS.createNode(parent, name, statinfo.mode);
        node.cvmfs_statinfo = statinfo;

        const flags = node.cvmfs_statinfo.flags;
        if (flags & cvmfs.ENTRY_TYPE.NEST_TRANS) {
          const hash = parent.repo.getNestedCatalogHash(parent.catalog, path);
          node.catalog = parent.repo.getCatalog(hash);
        } else if (flags & cvmfs.ENTRY_TYPE.BIND_MOUNT) {
          const hash = parent.repo.getBindMountpointHash(parent.catalog, path);
          node.catalog = parent.repo.getCatalog(hash);

          node.cvmfs_bindpoint = PATH.join(FS.getPath(parent), name);
        }

        return node;
      },
      readdir: function(node) {
        if (node.cvmfs_entries === undefined) {
          const path = CVMFS.getRelativePath(node);
          const entries = node.repo.getEntriesForParentPath(node.catalog, path);

          if (entries === null)
            throw new FS.ErrnoError(ERRNO_CODES.ENOSYS);
          node.cvmfs_entries = entries;
        }

        return node.cvmfs_entries.concat(['.', '..']);
      },
      readlink: function(node) {
        return cvmfs_methods.readlink(node);
      },
      getattr: function(node) {
        return cvmfs_methods.getattr(node);
      }
    },
    stream_ops: {
      read: function(stream, buffer, offset, length, position) {
        return cvmfs_methods.read(stream, buffer, offset, length, position);
      },
      llseek: function(stream, offset, whence) {
        return cvmfs_methods.llseek(stream, offset, whence);
      }
    },
    symlink_vars: {},
    setSymlinkVar: function(symvar, value) {
      CVMFS.symlink_vars[symvar] = value;
    }
  }
});
