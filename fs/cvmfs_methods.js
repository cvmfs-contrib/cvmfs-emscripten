const cvmfs_methods = {
	readlink: function(node) {
    if (node.cvmfs_symlink === undefined) {
      const path = CVMFS.getRelativePath(node);
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
  read: function(stream, buffer, offset, length, position) {
    const node = stream.node;
    const flags = node.cvmfs_statinfo.flags;
    const path = CVMFS.getRelativePath(node);
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
      const content = node.repo.getContentForRegularFile(node.catalog, path, flags);

      if (content === null || position >= content.length)
        return 0;

      const size = Math.min(content.length - position, length);
      buffer.set(content.subarray(position, position + size), offset);
      bytes_read = size;
    }

    return bytes_read;
  },
  llseek: function(stream, offset, whence) {
    var position = offset;
    if (whence === 1) {  // SEEK_CUR.
      position += stream.position;
    } else if (whence === 2) {  // SEEK_END.
      if (FS.isFile(stream.node.mode)) {
        position += stream.node.usedBytes;
      }
    }
    if (position < 0) {
      throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
    }
    return position;
  },
  getattr: function(node) {
    const attr = {};
    attr.dev = 1;
    attr.ino = node.id;
    attr.mode = node.mode;
    attr.nlink = 1;
    attr.uid = node.cvmfs_statinfo.uid;
    attr.gid = node.cvmfs_statinfo.gid;
    attr.rdev = node.rdev;
    if (FS.isDir(node.mode) || FS.isFile(node.mode)) {
      attr.size = node.cvmfs_statinfo.size;
    } else if (FS.isLink(node.mode)) {
      attr.size = cvmfs_methods.readlink(node).length;
    } else {
      attr.size = 0;
    }
    attr.atime = new Date(node.cvmfs_statinfo.mtime);
    attr.mtime = new Date(node.cvmfs_statinfo.mtime);
    attr.ctime = new Date(node.cvmfs_statinfo.mtime);
    // NOTE: In Emscripten, st_blocks = Math.ceil(st_size/st_blksize),
    //       but this is not required by the standard.
    attr.blksize = 4096;
    attr.blocks = Math.ceil(attr.size / attr.blksize);
    return attr;
  },
};