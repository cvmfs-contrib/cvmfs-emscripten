mergeInto(LibraryManager.library, {
  $CVMFS__deps: ['$FS'],
  $CVMFS: {
    ops_table: null,
    mountroot: '/cvmfs',
    base_url: 'http://hepvm.cern.ch/cvmfs',
    repos: null,
    mount: function(mount) {
      const repo_name = mount.opts.repo_name;
      const repo = new cvmfs.repo(this.base_url, repo_name);

      if (this.repos === null) {
        this.repos = new Map();
      }

      this.repos.set(mount.mountpoint, repo);

      const manifest = repo.getManifest();
      const whitelist = repo.getWhitelist();
      const certificate = repo.getCertificate();
      console.log(manifest);
      console.log(whitelist);
      console.log(certificate);

      console.log(repo.getCatalogStats());
      console.log(repo.getCatalogProperties());

      return CVMFS.createNode(null, '/', {{{ cDefine('S_IFDIR') }}} | 0777);
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

      return node;
    },
    node_ops: {
      getattr: function(node) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOSYS);
      },
      lookup: function(parent, name) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOSYS);
      },
      readdir: function(node) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOSYS);
      },
      readlink: function(node) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOSYS);
      },
    },
    stream_ops: {
      read: function(stream, buffer, offset, length, position) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOSYS);
      }
    }
  }
});