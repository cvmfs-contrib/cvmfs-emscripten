#include <fcntl.h>
#include <assert.h>
#include <stdio.h>
#include <unistd.h>
#include <emscripten.h>

int main(){
	assert(open("/cvmfs/emscripten.cvmfs.io/test/",O_RDONLY) != -1);
	int fd=open("/cvmfs/emscripten.cvmfs.io/test/regular",O_RDONLY);
	assert(fd != -1);
	assert(open("/cvmfs/emscripten.cvmfs.io/test/not",O_RDONLY) == -1);

	char buf[100];
	read(fd, buf, 100);
	printf("content = %s",buf);
	return 0;
}