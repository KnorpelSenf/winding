const std = @import("std");
const c = @cImport({
    @cInclude("windows.h");
});

pub extern fn main() i32;

export fn printWindowClass(ptr: *const c.WNDCLASSEXW) void {
    var buf: [4096]u8 = undefined;
    var fba = std.heap.FixedBufferAllocator.init(&buf);
    const allocator = fba.allocator();
    var bw = std.io.bufferedWriter(std.io.getStdOut().writer());
    defer bw.flush() catch unreachable;
    const out = bw.writer();
    out.print(
        \\WNDCLASS({}){{
        \\
    , .{@sizeOf(c.WNDCLASSEXW)}) catch unreachable;
    inline for (@typeInfo(c.WNDCLASSEXW).Struct.fields) |field| {
        const value = @field(ptr, field.name);
        const printValue = switch (@typeInfo(@TypeOf(value))) {
            .Int => std.fmt.allocPrint(allocator, "{}", .{value}) catch unreachable,
            .Optional, .Pointer => b: {
                if (comptime std.mem.eql(u8, field.name, "lpszClassName")) {
                    break :b std.fmt.allocPrint(allocator, "\"{s}\"", .{
                        std.unicode.utf16leToUtf8Alloc(allocator, std.mem.span(value)) catch unreachable,
                    }) catch unreachable;
                }
                break :b std.fmt.allocPrint(allocator, "{}", .{@intFromPtr(value)}) catch unreachable;
            },

            else => |tag| @compileError("Unhandled: " ++ @tagName(tag)),
        };
        out.print("  {s}: {s}\n", .{ field.name, printValue }) catch unreachable;
    }
    out.print(
        \\}}
        \\
    , .{}) catch unreachable;
}
