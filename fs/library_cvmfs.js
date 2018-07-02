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
              read: CVMFS.stream_ops.read
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
      }

      return node;
    },
    getRelativePath: function(parent, name) {
      return PATH.join(FS.getPath(parent), name).replace(parent.mount.mountpoint, '');
    },
    node_ops: {
      getattr: function(node) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOSYS);
      },
      lookup: function(parent, name) {
        const path = CVMFS.getRelativePath(parent, name);
        const flags = parent.repo.getFlagsForPath(parent.catalog, path);

        var mode = 511;
        if (flags & cvmfs.ENTRY_TYPE.SYMB_LINK)
          mode |= {{{ cDefine('S_IFLNK') }}};
        else if (flags & cvmfs.ENTRY_TYPE.REG)
          mode |= {{{ cDefine('S_IFREG') }}};
        else if (flags & cvmfs.ENTRY_TYPE.DIR)
          mode |= {{{ cDefine('S_IFDIR') }}};
        else
          throw new FS.ErrnoError(ERRNO_CODES.ENOSYS);

        const node = CVMFS.createNode(parent, name, mode);
        node.cvmfs_flags = flags;

        if (flags & cvmfs.ENTRY_TYPE.NEST_TRANS) {
          const hash = parent.repo.getNestedCatalogHash(parent.catalog, path);
          node.catalog = parent.repo.getCatalog(hash);
        }

        return node;
      },
      readdir: function(node) {
        if (node.cvmfs_entries === undefined) {
          const path = FS.getPath(node).replace(node.mount.mountpoint, '');
          const entries = node.repo.getNamesForParentPath(node.catalog, path);
          if (entries === null)
            throw new FS.ErrnoError(ERRNO_CODES.ENOSYS);
          node.cvmfs_entries = entries;
        }

        return node.cvmfs_entries.concat(['.', '..']);
      },
      readlink: function(node) {
        if (node.cvmfs_symlink === undefined) {
          const path = FS.getPath(node).replace(node.mount.mountpoint, '');
          node.cvmfs_symlink = node.repo.getSymlinkForPath(node.catalog, path);
        }

        const re = /\$\(([^\$\(\)]*)\)/;
        let symlink = node.cvmfs_symlink;

        let match = symlink.match(re);
        while (match !== null) {
          const symvar = match[1];
          let symval = CVMFS.symlink_vars[symvar];
          if (symval === undefined)
            symval = '';
          symlink = symlink.replace(match[0], symval);

          match = symlink.match(re);
        }

        return symlink;
      },
    },
    stream_ops: {
      read: function(stream, buffer, offset, length, position) {
        const node = stream.node;
        const flags = node.cvmfs_flags;
        const path = FS.getPath(node).replace(node.mount.mountpoint, '');
        let bytes_read = 0;

        if (flags & cvmfs.ENTRY_TYPE.CHUNKD) {
          const lb = position;
          const ub = position + length - 1;
          const chunks = node.repo.getChunksWithinRangeForPath(node.catalog, path, flags, lb, ub);

          let total_chunk_len = 0;
          chunks.forEach(e => {
            const chunk = e.chunk;

            total_chunk_len += chunk.length;
            const size = Math.min(total_chunk_len - position, length);
            buffer.set(chunk.subarray(0, size), offset);

            length -= size;
            position += size;
            offset += size;

            bytes_read += size;
          });
        } else {
          const content = node.repo.getContentForRegularFile(node.catalog, path, node.cvmfs_flags);

          if (content === null || position >= content.length)
            return 0;

          const size = Math.min(content.length - position, length);
          buffer.set(content.subarray(position, position + size), offset);
          bytes_read = size;
        }

        return bytes_read;
      }
    },
    symlink_vars: {},
    setSymlinkVar: function(symvar, value) {
      CVMFS.symlink_vars[symvar] = value;
    }
  }
});
